import { BaseEntity } from './base.model';
import { Product } from './product.model';

export class Inventory extends BaseEntity {
  public parentLocation: string | Location | null;
  public dateStart: string;
  public dateEnd: string;
  public department: string;
  public isFinal: boolean;
  public inventory: InventoryItem[];
  public value: number;

  constructor(
    parentLocation: string | Location | null,
    dateStart: string,
    dateEnd: string,
    department: string,
    isFinal: boolean,
    inventory: InventoryItem[],
    value: number
    ) {
      super();
      this.parentLocation = parentLocation;
      this.dateStart = dateStart;
      this.dateEnd = dateEnd;
      this.department = department;
      this.isFinal = isFinal;
      this.inventory = inventory;
      this.value = value;
    }

  }

  export interface InventoryItem {
    product: Product;
    quantity: number;
  }
