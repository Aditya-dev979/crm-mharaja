import { useState } from "react";
import GemImage from "@/components/products/GemImage";
import Modal from "@/components/feedback/Modal";
import { SelectField, TextField } from "@/components/forms/Field";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/useToast";
import type { GemTone, Product } from "@/types";
import { cn } from "@/utils";

const tones: GemTone[] = ["sapphire", "yellow-sapphire", "bicolour", "ruby", "emerald", "diamond", "spinel", "gold", "pearl"];

export default function ProductGallery({ product }: { product: Product }) {
  const { addImage, deleteImage, setPrimaryImage, moveImage } = useProducts();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTone, setNewTone] = useState<GemTone>(product.images[0]?.tone ?? "gold");

  const active =
    product.images.find(img => img.id === selectedId) ??
    product.images.find(img => img.id === product.primaryImageId) ??
    product.images[0];

  const submitAdd = () => {
    addImage(product.id, newLabel.trim() || `View ${product.images.length + 1}`, newTone);
    setAddOpen(false);
    setNewLabel("");
    toast({ tone: "success", title: "Image added", message: "The new view was attached to this product." });
  };

  return (
    <div className="gallery">
      {active ? (
        <button type="button" className="gallery-hero" onClick={() => setZoomOpen(true)} aria-label={`Preview ${active.label}`}>
          <GemImage tone={active.tone} label={active.label} size="hero" />
          <span className="zoom-hint"><Icon name="search" size={14} /> Click to zoom</span>
        </button>
      ) : (
        <div className="gallery-hero empty">
          <Icon name="gem" size={40} />
          <span>No images yet</span>
        </div>
      )}
      <div className="gallery-thumbs">
        {product.images.map((img, index) => (
          <div key={img.id} className={cn("gallery-thumb", active?.id === img.id && "active")}>
            <button type="button" className="thumb-btn" onClick={() => setSelectedId(img.id)} aria-label={`View ${img.label}`}>
              <GemImage tone={img.tone} size="thumb" />
              {product.primaryImageId === img.id && <span className="primary-star" title="Primary image">★</span>}
            </button>
            <div className="thumb-tools">
              <IconButton label={`Move ${img.label} earlier`} disabled={index === 0} onClick={() => moveImage(product.id, img.id, -1)}>
                <Icon name="arrow" size={12} />
              </IconButton>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setPrimaryImage(product.id, img.id);
                  toast({ tone: "success", title: "Primary image set", message: img.label });
                }}
                disabled={product.primaryImageId === img.id}
              >
                Primary
              </button>
              <IconButton label={`Move ${img.label} later`} disabled={index === product.images.length - 1} onClick={() => moveImage(product.id, img.id, 1)}>
                <Icon name="arrow" size={12} />
              </IconButton>
              <IconButton
                label={`Delete ${img.label}`}
                onClick={() => {
                  deleteImage(product.id, img.id);
                  if (selectedId === img.id) setSelectedId(null);
                  toast({ tone: "info", title: "Image removed", message: img.label });
                }}
              >
                <Icon name="close" size={12} />
              </IconButton>
            </div>
          </div>
        ))}
        <button type="button" className="gallery-add" onClick={() => setAddOpen(true)}>
          <Icon name="plus" />
          <span>Add image</span>
        </button>
      </div>

      <Modal open={zoomOpen} onClose={() => setZoomOpen(false)} className="zoom-modal" labelledBy="zoom-title">
        <h2 id="zoom-title" className="sr-only-text">{product.name} — {active?.label}</h2>
        {active && <GemImage tone={active.tone} label={`${product.name} · ${active.label}`} size="zoom" />}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setZoomOpen(false)}>Close preview</Button>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} labelledBy="add-image-title">
        <div className="modal-icon royal-icon"><Icon name="upload" /></div>
        <h2 id="add-image-title">Add product image</h2>
        <p>Attach another view of {product.name}. In production this uploads a photo; the prototype uses tone-matched placeholders.</p>
        <TextField label="Image label" placeholder="e.g. Side profile, Macro, On hand" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
        <SelectField label="Placeholder tone" value={newTone} onChange={e => setNewTone(e.target.value as GemTone)}>
          {tones.map(t => <option key={t} value={t}>{t}</option>)}
        </SelectField>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={submitAdd}>Add image</Button>
        </div>
      </Modal>
    </div>
  );
}
