import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { seedMovements } from "@/data/inventoryData";
import { productLocations, seedCategories, seedProducts } from "@/data/productData";
import type { GemTone, Product, ProductCategory, ProductCertificate, StockMovement } from "@/types";

const CURRENT_USER = "Arjun Sharma";

interface ProductsStore {
  products: Product[];
  categories: ProductCategory[];
  movements: StockMovement[];
  locations: string[];
  logMovement: (entry: Omit<StockMovement, "id" | "time" | "user"> & { user?: string }) => void;
  addLocation: (name: string) => void;
  addProduct: (product: Omit<Product, "id" | "images" | "primaryImageId" | "activity" | "created">, tone: GemTone) => Product;
  updateProduct: (id: string, patch: Partial<Product>, activityText?: string) => void;
  logActivity: (id: string, text: string) => void;
  duplicateProduct: (id: string) => Product | null;
  addImage: (id: string, label: string, tone: GemTone) => void;
  deleteImage: (id: string, imageId: string) => void;
  setPrimaryImage: (id: string, imageId: string) => void;
  moveImage: (id: string, imageId: string, direction: -1 | 1) => void;
  setCertificate: (id: string, certificate: ProductCertificate | null, activityText: string) => void;
  addCategory: (name: string, kind: ProductCategory["kind"]) => void;
  updateCategory: (id: string, patch: Partial<ProductCategory>) => void;
}

const ProductsContext = createContext<ProductsStore | null>(null);

export function useProducts(): ProductsStore {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}

export const productMargin = (p: Pick<Product, "purchasePrice" | "sellingPrice">) =>
  p.purchasePrice > 0 ? Math.round(((p.sellingPrice - p.purchasePrice) / p.purchasePrice) * 100) : 0;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(seedCategories);
  const [movements, setMovements] = useState<StockMovement[]>(seedMovements);
  const [locations, setLocations] = useState<string[]>(productLocations);
  const counter = useRef(1);

  const logMovement = useCallback(
    (entry: Omit<StockMovement, "id" | "time" | "user"> & { user?: string }) => {
      setMovements(list => [
        { ...entry, user: entry.user ?? CURRENT_USER, id: `mv-new-${counter.current++}`, time: "Just now" },
        ...list,
      ]);
    },
    [],
  );

  const addLocation = useCallback((name: string) => {
    setLocations(list => (list.includes(name) ? list : [...list, name]));
  }, []);

  const withActivity = (product: Product, text: string): Product => ({
    ...product,
    activity: [{ text, user: CURRENT_USER, time: "Just now" }, ...product.activity],
  });

  const updateProduct = useCallback((id: string, patch: Partial<Product>, activityText?: string) => {
    setProducts(list =>
      list.map(p => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        return activityText ? withActivity(next, activityText) : next;
      }),
    );
  }, []);

  const logActivity = useCallback((id: string, text: string) => {
    setProducts(list => list.map(p => (p.id === id ? withActivity(p, text) : p)));
  }, []);

  const addProduct = useCallback(
    (draft: Omit<Product, "id" | "images" | "primaryImageId" | "activity" | "created">, tone: GemTone) => {
      const id = `prd-new-${counter.current++}`;
      const imageId = `${id}-img-1`;
      const full: Product = {
        ...draft,
        id,
        created: "Just now",
        images: [{ id: imageId, label: "Hero", tone }],
        primaryImageId: imageId,
        activity: [{ text: "Product created", user: CURRENT_USER, time: "Just now" }],
      };
      setProducts(list => [full, ...list]);
      return full;
    },
    [],
  );

  const duplicateProduct = useCallback(
    (id: string): Product | null => {
      const source = products.find(p => p.id === id);
      if (!source) return null;
      const newId = `prd-new-${counter.current++}`;
      const copy: Product = {
        ...source,
        id: newId,
        sku: `${source.sku}-C`,
        name: `${source.name} (copy)`,
        status: "Available",
        certificate: null,
        created: "Just now",
        images: source.images.map((img, i) => ({ ...img, id: `${newId}-img-${i}` })),
        primaryImageId: source.images.length ? `${newId}-img-0` : null,
        activity: [{ text: `Duplicated from ${source.sku}`, user: CURRENT_USER, time: "Just now" }],
      };
      setProducts(list => [copy, ...list]);
      return copy;
    },
    [products],
  );

  const addImage = useCallback((id: string, label: string, tone: GemTone) => {
    setProducts(list =>
      list.map(p => {
        if (p.id !== id) return p;
        const imageId = `${id}-img-${p.images.length + 1}-${counter.current++}`;
        const next = {
          ...p,
          images: [...p.images, { id: imageId, label, tone }],
          primaryImageId: p.primaryImageId ?? imageId,
        };
        return withActivity(next, `Image added — ${label}`);
      }),
    );
  }, []);

  const deleteImage = useCallback((id: string, imageId: string) => {
    setProducts(list =>
      list.map(p => {
        if (p.id !== id) return p;
        const images = p.images.filter(img => img.id !== imageId);
        const primaryImageId = p.primaryImageId === imageId ? (images[0]?.id ?? null) : p.primaryImageId;
        return withActivity({ ...p, images, primaryImageId }, "Image removed");
      }),
    );
  }, []);

  const setPrimaryImage = useCallback((id: string, imageId: string) => {
    setProducts(list =>
      list.map(p => (p.id === id ? withActivity({ ...p, primaryImageId: imageId }, "Primary image changed") : p)),
    );
  }, []);

  const moveImage = useCallback((id: string, imageId: string, direction: -1 | 1) => {
    setProducts(list =>
      list.map(p => {
        if (p.id !== id) return p;
        const index = p.images.findIndex(img => img.id === imageId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= p.images.length) return p;
        const images = [...p.images];
        [images[index], images[target]] = [images[target], images[index]];
        return { ...p, images };
      }),
    );
  }, []);

  const setCertificate = useCallback((id: string, certificate: ProductCertificate | null, activityText: string) => {
    setProducts(list => list.map(p => (p.id === id ? withActivity({ ...p, certificate }, activityText) : p)));
  }, []);

  const addCategory = useCallback((name: string, kind: ProductCategory["kind"]) => {
    setCategories(list => [
      ...list,
      { id: `cat-new-${counter.current++}`, name, kind, active: true },
    ]);
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<ProductCategory>) => {
    setCategories(list => list.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const value = useMemo(
    () => ({
      products,
      categories,
      movements,
      locations,
      logMovement,
      addLocation,
      addProduct,
      updateProduct,
      logActivity,
      duplicateProduct,
      addImage,
      deleteImage,
      setPrimaryImage,
      moveImage,
      setCertificate,
      addCategory,
      updateCategory,
    }),
    [products, categories, movements, locations, logMovement, addLocation, addProduct, updateProduct, logActivity, duplicateProduct, addImage, deleteImage, setPrimaryImage, moveImage, setCertificate, addCategory, updateCategory],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}
