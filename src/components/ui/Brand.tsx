export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark"><span>MS</span></div>
      {!compact && (
        <div>
          <strong>MAHARAJA</strong>
          <small>SOAP · CRM & ERP</small>
        </div>
      )}
    </div>
  );
}
