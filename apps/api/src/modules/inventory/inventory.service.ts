import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { User, UserDocument } from "../users/schemas/user.schema";
import { CreateMaterialDto, StockMovementDto, UpdateMaterialDto } from "./dto/material.dto";
import { Material, MaterialDocument } from "./schemas/material.schema";
import { StockMovement, StockMovementDocument } from "./schemas/stock-movement.schema";

/** Quantities are kept to 2 decimals, so 0.1 + 0.2 stays 0.3. */
const round2 = (n: number) => Math.round(n * 100) / 100;

const MAX_MATERIALS_PER_SHOP = 2000;

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Material.name) private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(StockMovement.name) private readonly movementModel: Model<StockMovementDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private withStatus<T extends { quantity: number; lowStockAt?: number | null }>(material: T) {
    const low = material.lowStockAt !== null && material.lowStockAt !== undefined && material.quantity <= material.lowStockAt;
    return { ...material, lowStock: low, outOfStock: material.quantity <= 0 };
  }

  private async findMaterial(shopId: string, materialId: string) {
    const material = isValidObjectId(materialId)
      ? await this.materialModel.findOne({ _id: materialId, shopId }).lean()
      : null;
    if (!material) throw new NotFoundException("Material not found");
    return material;
  }

  async list(shopId: string) {
    const materials = await this.materialModel.find({ shopId }).sort({ category: 1, name: 1 }).lean();
    const items = materials.map((m) => this.withStatus(m));
    const value = items.reduce((sum, m) => sum + (m.costPerUnit ?? 0) * m.quantity, 0);
    return {
      items,
      summary: {
        count: items.length,
        lowStock: items.filter((m) => m.lowStock).length,
        outOfStock: items.filter((m) => m.outOfStock).length,
        stockValue: Math.round(value),
      },
    };
  }

  async findOne(shopId: string, materialId: string) {
    return this.withStatus(await this.findMaterial(shopId, materialId));
  }

  async create(shopId: string, dto: CreateMaterialDto, userId: string) {
    if ((await this.materialModel.countDocuments({ shopId })) >= MAX_MATERIALS_PER_SHOP) {
      throw new BadRequestException(`A shop can keep up to ${MAX_MATERIALS_PER_SHOP} materials. Delete ones you no longer use.`);
    }
    const quantity = round2(dto.quantity ?? 0);
    const material = await this.materialModel.create({
      shopId,
      name: dto.name.trim(),
      category: dto.category,
      color: dto.color?.trim() || undefined,
      colorHex: dto.colorHex || undefined,
      unit: dto.unit,
      quantity,
      lowStockAt: dto.lowStockAt ?? null,
      costPerUnit: dto.costPerUnit ?? null,
      supplier: dto.supplier?.trim() || undefined,
      notes: dto.notes?.trim() || undefined,
    });
    if (quantity > 0) {
      await this.movementModel.create({
        shopId,
        materialId: String(material._id),
        type: "in",
        change: quantity,
        balance: quantity,
        note: "Opening stock",
        costPerUnit: dto.costPerUnit ?? null,
        by: userId,
      });
    }
    return this.withStatus(material.toObject());
  }

  async update(shopId: string, materialId: string, dto: UpdateMaterialDto) {
    await this.findMaterial(shopId, materialId);
    // Fields left out stay as they are; null clears the optional numbers.
    const set: Record<string, unknown> = {};
    if (dto.name !== undefined) set.name = dto.name.trim();
    if (dto.category !== undefined) set.category = dto.category;
    if (dto.color !== undefined) set.color = dto.color.trim() || null;
    if (dto.colorHex !== undefined) set.colorHex = dto.colorHex || null;
    if (dto.unit !== undefined) set.unit = dto.unit;
    if (dto.lowStockAt !== undefined) set.lowStockAt = dto.lowStockAt;
    if (dto.costPerUnit !== undefined) set.costPerUnit = dto.costPerUnit;
    if (dto.supplier !== undefined) set.supplier = dto.supplier.trim() || null;
    if (dto.notes !== undefined) set.notes = dto.notes.trim() || null;
    const updated = await this.materialModel.findOneAndUpdate({ _id: materialId, shopId }, { $set: set }, { new: true }).lean();
    return this.withStatus(updated!);
  }

  async remove(shopId: string, materialId: string) {
    await this.findMaterial(shopId, materialId);
    await this.materialModel.deleteOne({ _id: materialId, shopId });
    await this.movementModel.deleteMany({ shopId, materialId });
    return { success: true };
  }

  /**
   * Records stock coming in, going out, or a recount. Each change is a single
   * atomic update, so people changing the same material at once never lose
   * each other's changes, and stock never goes below zero.
   */
  async move(shopId: string, materialId: string, dto: StockMovementDto, userId: string) {
    const material = await this.findMaterial(shopId, materialId);
    if (dto.type !== "adjust" && dto.quantity <= 0) {
      throw new BadRequestException(dto.type === "in" ? "Enter how much came in" : "Enter how much was used");
    }

    let updated: (Material & { _id: unknown }) | null;
    let change: number;
    if (dto.type === "in" || dto.type === "out") {
      change = round2(dto.type === "in" ? dto.quantity : -dto.quantity);
      const set: Record<string, unknown> = { quantity: { $round: [{ $add: ["$quantity", change] }, 2] } };
      // A purchase at a new price updates the cost used for the stock value.
      if (dto.type === "in" && dto.costPerUnit !== undefined) set.costPerUnit = dto.costPerUnit;
      updated = await this.materialModel
        .findOneAndUpdate(
          // Using stock only succeeds while enough is left.
          { _id: materialId, shopId, ...(dto.type === "out" ? { quantity: { $gte: dto.quantity } } : {}) },
          [{ $set: set }],
          { new: true },
        )
        .lean();
      if (!updated) {
        const now = await this.findMaterial(shopId, materialId);
        throw new BadRequestException(`Only ${now.quantity} ${now.unit} in stock`);
      }
    } else {
      // A recount sets the stock to what was counted; written only if the stock
      // didn't change since it was read, so the recorded difference is right.
      const counted = round2(dto.quantity);
      let current = material.quantity;
      updated = null;
      change = 0;
      for (let attempt = 0; attempt < 8 && !updated; attempt++) {
        if (attempt > 0) current = (await this.findMaterial(shopId, materialId)).quantity;
        if (counted === current) throw new BadRequestException("The counted stock is the same as now");
        change = round2(counted - current);
        updated = await this.materialModel
          .findOneAndUpdate({ _id: materialId, shopId, quantity: current }, { $set: { quantity: counted } }, { new: true })
          .lean();
      }
      if (!updated) throw new ConflictException("Stock was being changed by someone else. Please try again.");
    }

    const movement = await this.movementModel.create({
      shopId,
      materialId,
      type: dto.type,
      change,
      balance: updated.quantity,
      note: dto.note?.trim() || undefined,
      orderNo: dto.type === "out" ? dto.orderNo ?? null : null,
      costPerUnit: dto.type === "in" ? dto.costPerUnit ?? null : null,
      by: userId,
    });
    return { material: this.withStatus(updated), movement: movement.toObject() };
  }

  /** Recent changes to one material, newest first, with who made them. */
  async history(shopId: string, materialId: string): Promise<Array<Record<string, unknown>>> {
    await this.findMaterial(shopId, materialId);
    const movements = await this.movementModel.find({ shopId, materialId }).sort({ createdAt: -1 }).limit(200).lean();
    const userIds = [...new Set(movements.map((m) => m.by).filter((id): id is string => !!id && isValidObjectId(id)))];
    const users = await this.userModel.find({ _id: { $in: userIds } }).select("name email").lean();
    const names = new Map(users.map((u) => [String(u._id), u.name || u.email]));
    return movements.map((m) => ({ ...m, byName: m.by ? names.get(m.by) ?? null : null }));
  }
}
