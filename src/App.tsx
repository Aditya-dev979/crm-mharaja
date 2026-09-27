import { useEffect, useMemo, useState } from "react";
import BranchSelector from "@/components/layout/BranchSelector";
import MaharajaAi from "@/components/ai/MaharajaAi";
import CommandPalette from "@/components/layout/CommandPalette";
import Header from "@/components/layout/Header";
import { pageNames, type PageId } from "@/components/layout/navigation";
import NotificationCenter from "@/components/layout/NotificationCenter";
import QuickCreate from "@/components/layout/QuickCreate";
import Sidebar from "@/components/layout/Sidebar";
import Brand from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import UserMenu from "@/components/layout/UserMenu";
import { branches, notificationsSeed, searchRecords } from "@/data/mockData";
import { saleTotals } from "@/data/salesData";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { CrmProvider, useCrm } from "@/hooks/useCrm";
import { DispatchProvider } from "@/hooks/useDispatch";
import { FinanceProvider } from "@/hooks/useFinance";
import { InventoryProvider } from "@/hooks/useInventory";
import { PostSalesProvider } from "@/hooks/usePostSales";
import { ProductionProvider } from "@/hooks/useProduction";
import { ProductsProvider, useProducts } from "@/hooks/useProducts";
import { PurchaseProvider } from "@/hooks/usePurchase";
import { QualityProvider } from "@/hooks/useQuality";
import { SalesProvider, useSales } from "@/hooks/useSales";
import { TeamProvider } from "@/hooks/useTeam";
import { WorkshopProvider } from "@/hooks/useWorkshop";
import { ToastProvider, useToast } from "@/hooks/useToast";
import AdminPage, { type AdminIntent } from "@/pages/AdminPage";
import AuthenticationPage from "@/pages/AuthenticationPage";
import ComponentsPage from "@/pages/ComponentsPage";
import CoverPage from "@/pages/CoverPage";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import DispatchPage from "@/pages/DispatchPage";
import FinancePage, { type FinanceIntent } from "@/pages/FinancePage";
import InventoryPage from "@/pages/InventoryPage";
import LeadsPage from "@/pages/LeadsPage";
import PostSalesPage from "@/pages/PostSalesPage";
import ProductionPage from "@/pages/ProductionPage";
import ProductsPage from "@/pages/ProductsPage";
import PurchasePage from "@/pages/PurchasePage";
import QualityPage from "@/pages/QualityPage";
import ReportsPage from "@/pages/ReportsPage";
import SalesPage, { type SalesIntent } from "@/pages/SalesPage";
import TeamPage, { type TeamIntent } from "@/pages/TeamPage";
import WorkshopPage from "@/pages/WorkshopPage";
import type { SearchRecord } from "@/types";
import { formatINR } from "@/utils";
import DesignSystemPage from "@/pages/DesignSystemPage";
import FoundationsPage from "@/pages/FoundationsPage";
import ShellPage from "@/pages/ShellPage";
import { cn } from "@/utils";

type Overlay = null | "search" | "quick" | "notifications" | "branch" | "user";

function AppShell() {
  const toast = useToast();
  const [page, setPage] = useState<PageId>("cover");
  /* Entry flow: Cover → Authentication → Dashboard → workspace.
     Design-foundation pages stay open; every business workspace needs a session. */
  const [authenticated, setAuthenticated] = useState(false);
  /* Nav entries can target a specific tab of an existing page. */
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeNavKey, setActiveNavKey] = useState<string | null>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [branchId, setBranchId] = useState(branches[0].id);
  const [notifications, setNotifications] = useState(notificationsSeed);
  const [leadIntent, setLeadIntent] = useState<"create" | null>(null);
  const [customerIntent, setCustomerIntent] = useState<"create" | null>(null);
  const [productIntent, setProductIntent] = useState<"create" | null>(null);
  const [focusCustomerId, setFocusCustomerId] = useState<string | null>(null);
  /* The record a page currently has open, reported up by that page. Used only
     to give the assistant context — navigation state is untouched. */
  const [pageContext, setPageContext] = useState<{ id?: string; label?: string }>({});
  const [focusLeadId, setFocusLeadId] = useState<string | null>(null);
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const [salesIntent, setSalesIntent] = useState<SalesIntent | null>(null);
  const [purchaseIntent, setPurchaseIntent] = useState<"create-pr" | null>(null);
  const [focusReturnId, setFocusReturnId] = useState<string | null>(null);
  const [focusInspectionId, setFocusInspectionId] = useState<string | null>(null);
  const [focusRepairId, setFocusRepairId] = useState<string | null>(null);
  const [focusQuotationId, setFocusQuotationId] = useState<string | null>(null);
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const [focusCustomOrderId, setFocusCustomOrderId] = useState<string | null>(null);
  const [focusProductionId, setFocusProductionId] = useState<string | null>(null);
  const [focusPurchaseId, setFocusPurchaseId] = useState<string | null>(null);
  const [focusPostSalesId, setFocusPostSalesId] = useState<string | null>(null);
  const [focusShipmentId, setFocusShipmentId] = useState<string | null>(null);
  const [inventoryIntent, setInventoryIntent] = useState<string | null>(null);
  const [focusFinanceDocId, setFocusFinanceDocId] = useState<string | null>(null);
  const [financeIntent, setFinanceIntent] = useState<FinanceIntent | null>(null);
  const [teamIntent, setTeamIntent] = useState<TeamIntent>(null);
  const [adminIntent, setAdminIntent] = useState<AdminIntent>(null);

  const { customers } = useCrm();
  const { currentUser } = useAdmin();
  const { products } = useProducts();
  const { quotations, orders } = useSales();

  const searchIndex = useMemo<SearchRecord[]>(
    () => [
      ...customers.map(c => ({
        id: `search-${c.id}`,
        category: "Customers" as const,
        title: c.name,
        meta: `${c.id.replace("cust-", "CUST-")} · ${c.city}`,
        icon: "user" as const,
        customerId: c.id,
      })),
      ...products.map(p => ({
        id: `search-${p.id}`,
        category: "Products" as const,
        title: p.name,
        meta: `${p.sku} · ${p.status}`,
        icon: "gem" as const,
        productId: p.id,
      })),
      ...products
        .filter(p => p.certificate)
        .map(p => ({
          id: `search-cert-${p.id}`,
          category: "Certificates" as const,
          title: p.certificate!.number,
          meta: `${p.certificate!.authority} · ${p.name}`,
          icon: "shield" as const,
          productId: p.id,
        })),
      ...orders.map(o => ({
        id: `search-${o.id}`,
        category: "Orders" as const,
        title: `Sales Order ${o.id}`,
        meta: `${o.customerName} · ${formatINR(saleTotals(o.lines, o.gstPct).total)} · ${o.status}`,
        icon: "grid" as const,
        orderId: o.id,
      })),
      ...quotations.map(q => ({
        id: `search-${q.id}`,
        category: "Orders" as const,
        title: `Quotation ${q.id}`,
        meta: `${q.customerName} · ${formatINR(saleTotals(q.lines, q.gstPct).total)} · ${q.status}`,
        icon: "component" as const,
        quotationId: q.id,
      })),
    ],
    [customers, products, orders, quotations],
  );

  const activeBranch = branches.find(b => b.id === branchId) ?? branches[0];
  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay(o => (o === "search" ? null : "search"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOverlay(null);
  const toggle = (target: Exclude<Overlay, null>) => setOverlay(o => (o === target ? null : target));

  const openPages: PageId[] = ["cover", "authentication", "foundations", "design-system", "components", "shell"];

  const navigate = (id: PageId, tab?: string, navKey?: string) => {
    if (!authenticated && !openPages.includes(id)) {
      setPage("authentication");
      setMobileNav(false);
      setOverlay(null);
      window.scrollTo(0, 0);
      toast({ tone: "info", title: "Sign in to continue", message: "The workspace opens after authentication." });
      return;
    }
    setPage(id);
    setPendingTab(tab ?? null);
    setActiveNavKey(navKey ?? null);
    setMobileNav(false);
    setOverlay(null);
    window.scrollTo(0, 0);
  };

  const signIn = () => {
    setAuthenticated(true);
    setPage("dashboard");
    setActiveNavKey("dashboard");
    setPendingTab(null);
    setOverlay(null);
    window.scrollTo(0, 0);
  };

  const signOut = () => {
    setAuthenticated(false);
    setPage("authentication");
    setOverlay(null);
    window.scrollTo(0, 0);
  };

  const selectBranch = (id: string) => {
    const branch = branches.find(b => b.id === id);
    setBranchId(id);
    close();
    if (branch && id !== branchId) {
      toast({
        tone: "success",
        title: `Switched to ${branch.name}`,
        message: "Stock and pricing now reflect this branch.",
      });
    }
  };

  const openCustomer = (customerId: string) => {
    setFocusCustomerId(customerId);
    navigate("customers");
  };

  const openLead = (leadId: string) => {
    setFocusLeadId(leadId);
    navigate("leads");
  };

  const openProduct = (productId: string) => {
    setFocusProductId(productId);
    navigate("products");
  };

  const openQuotation = (quotationId: string) => {
    setFocusQuotationId(quotationId);
    navigate("sales");
  };

  const openOrder = (orderId: string) => {
    setFocusOrderId(orderId);
    navigate("sales");
  };

  const createQuotation = (preset: Omit<SalesIntent, "mode"> = {}) => {
    setSalesIntent({ mode: "create-quote", ...preset });
    navigate("sales");
  };

  const openReturn = (returnId: string) => {
    setFocusReturnId(returnId);
    navigate("quality");
  };

  const openInspection = (inspectionId: string) => {
    setFocusInspectionId(inspectionId);
    navigate("quality");
  };

  const openRepair = (repairId: string) => {
    setFocusRepairId(repairId);
    navigate("workshop");
  };

  const openCustomOrder = (customOrderId: string) => {
    setFocusCustomOrderId(customOrderId);
    navigate("workshop");
  };

  const openProduction = (productionId: string) => {
    setFocusProductionId(productionId);
    navigate("production");
  };

  /* One dispatch journey: an order hands over to its shipment in Dispatch. */
  const openShipment = (shipmentId: string) => {
    setFocusShipmentId(shipmentId);
    navigate("dispatch", "Shipments", "dsp-ship");
  };

  const openFinanceDoc = (docId: string) => {
    setFocusFinanceDocId(docId);
    navigate("finance");
  };

  /* One entry point for every deep link: notifications, tasks and audit rows all
     carry a record id, and the prefix says which workspace owns it. */
  const openRecordById = (raw?: string, fallbackTarget?: string) => {
    const id = (raw ?? "").split("·")[0].split("—")[0].trim();
    if (id) {
      if (/^SO-/.test(id)) return openOrder(id);
      if (/^QT-/.test(id)) return openQuotation(id);
      if (/^(INV|PI|CN|DN|ADV|RC|EXP|TLY|BILL)-/.test(id)) return openFinanceDoc(id);
      if (/^BNK-/.test(id)) return navigate("finance", "Bank", "fin-bank");
      if (/^RT-/.test(id)) return openReturn(id);
      if (/^QI-/.test(id)) return openInspection(id);
      if (/^(PRD|CMA)-/.test(id)) return openProduction(id);
      if (/^(DEV|GRN|PO|SQ|PR)-/.test(id)) {
        setFocusPurchaseId(id);
        return navigate("purchase");
      }
      if (/^(TK|FB)-/.test(id)) {
        setFocusPostSalesId(id);
        return navigate("post-sales");
      }
      if (/^DS-/.test(id)) {
        setFocusShipmentId(id);
        return navigate("dispatch");
      }
      if (/^GP-/.test(id)) {
        setInventoryIntent("gate-pass");
        return navigate("inventory");
      }
      if (/^(RJ|CO)-/.test(id)) return openCustomOrder(id);
      if (/^LD-/.test(id)) return openLead(id);
      /* Supporting modules: tasks, staff, catalogue SKUs, customers, transfers
         and verification sessions all open from a notification too. */
      if (/^TSK-/.test(id)) return navigate("team", "Tasks", "tm-task");
      if (/^(aud|stf)-/.test(id)) return navigate("team", "Audit Trail", "tm-audit");
      if (/^cust-/.test(id)) return openCustomer(id);
      if (/^MS-/.test(id)) {
        setProductIntent(null);
        return navigate("products");
      }
      if (/^TR-/.test(id)) return navigate("inventory", "Transfers", "inv-stock");
      if (/^(VS|SES)-/.test(id)) return navigate("inventory", "Verification", "inv-ver");
      if (/^(BOM|FG-LOT)-/.test(id)) return navigate("production", "Formulation", "prd-bom");
    }
    if (fallbackTarget) navigate(fallbackTarget as PageId);
  };

  const quickAction = (label: string) => {
    close();
    if (label === "New Lead") {
      setLeadIntent("create");
      navigate("leads");
      return;
    }
    if (label === "New Customer") {
      setCustomerIntent("create");
      navigate("customers");
      return;
    }
    if (label === "New Product") {
      setProductIntent("create");
      navigate("products");
      return;
    }
    if (label === "New Quotation") {
      createQuotation();
      return;
    }
    if (label === "New Sales Order" || label === "New Order") {
      navigate("sales");
      toast({ tone: "info", title: "Sales orders", message: "Use Quick order, or convert an accepted quotation." });
      return;
    }
    if (label === "Purchase Request" || label === "New Purchase") {
      setPurchaseIntent("create-pr");
      navigate("purchase");
      return;
    }
    if (label === "New Expense") {
      setFinanceIntent("new-expense");
      navigate("finance");
      return;
    }
    if (label === "New Invoice") {
      setFinanceIntent("new-invoice");
      navigate("finance");
      return;
    }
    if (label === "New Payment") {
      setFinanceIntent("record-payment");
      navigate("finance");
      return;
    }
    if (label === "New Task") {
      setTeamIntent("new-task");
      navigate("team");
      return;
    }
    toast({
      tone: "info",
      title: label,
      message: "Use the module navigation on the left — every workspace is live.",
    });
  };

  const moduleTargets: Record<string, PageId> = {
    "Customers": "customers",
    "CRM · Leads": "leads",
    "Leads": "leads",
    "Products": "products",
    "Inventory": "inventory",
    "Warehouse": "inventory",
    "Sales reports": "sales",
    "Orders": "sales",
    "Quotations": "sales",
    "Purchase": "purchase",
    "Suppliers": "purchase",
    "GRN": "purchase",
    "Quality inspection": "quality",
    "Returns": "quality",
    "Production": "production",
    "Manufacturing": "production",
    "Contract Manufacturing": "production",
    "Repair": "workshop",
    "Custom orders": "workshop",
    "Billing": "finance",
    "Payments": "finance",
    "Accounts": "finance",
    "Expenses": "finance",
    "Pending Payments": "finance",
    "Post-Sales": "post-sales",
    "Feedback": "post-sales",
    "Support": "post-sales",
    "Dispatch": "dispatch",
    "Delivery": "dispatch",
    "Communication": "dispatch",
    "Reports": "reports",
    "Analytics": "reports",
    "Team": "team",
    "Staff": "team",
    "Tasks": "team",
    "Audit": "team",
    "Settings": "admin",
    "Users": "admin",
    "Roles": "admin",
  };

  const openModule = (module: string) => {
    const target = Object.entries(moduleTargets).find(([key]) => module.startsWith(key));
    if (target) {
      navigate(target[1]);
      return;
    }
    toast({
      tone: "info",
      title: module,
      message: "Reach it from the workspace navigation — every module is live.",
    });
  };

  const userAction = (label: string) => {
    close();
    if (label === "Sign out") {
      signOut();
      toast({ tone: "success", title: "Signed out", message: "Your session was closed. Sign in again to continue." });
      return;
    }
    setAdminIntent("settings");
    navigate("admin");
  };

  /* Before sign-in the product shows only its front door: cover and login,
     full-bleed, with no workspace chrome behind them. */
  if (!authenticated && (page === "cover" || page === "authentication")) {
    return (
      <div className="app app-entry">
        <header className="entry-bar">
          <button type="button" className="entry-brand" onClick={() => setPage("cover")} aria-label="Maharaja Soap — product overview">
            <Brand />
          </button>
          <div className="entry-bar-actions">
            <span className="entry-tag"><Icon name="shield" size={13} /> Prototype · role-aware access</span>
            {page === "cover" ? (
              <Button variant="secondary" onClick={() => setPage("authentication")}>
                <Icon name="lock" /> Sign in
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setPage("cover")}>
                Product overview
              </Button>
            )}
          </div>
        </header>
        <main className="entry-main">
          {page === "cover" && <CoverPage navigate={id => setPage(id)} activeBranch={activeBranch} />}
          {page === "authentication" && (
            <AuthenticationPage onEnterWorkspace={signIn} onBackToCover={() => setPage("cover")} />
          )}
        </main>
      </div>
    );
  }

  /* The assistant is context-aware: whichever detail view is open becomes the
     record it answers about. Read from the focus state the shell already keeps,
     so no new state is introduced. */
  const contextId =
    pageContext.id ??
    focusCustomerId ?? focusOrderId ?? focusQuotationId ?? focusShipmentId ?? focusProductionId ??
    focusPurchaseId ?? focusReturnId ?? focusLeadId ?? focusFinanceDocId ?? focusInspectionId ??
    focusPostSalesId ?? focusProductId ?? undefined;
  const contextLabel = pageContext.label ?? (focusCustomerId
    ? customers.find(c => c.id === focusCustomerId)?.name ?? focusCustomerId
    : focusLeadId
      ? focusLeadId
      : contextId);

  return (
    <div className="app">
      <Sidebar
        page={page}
        activeNavKey={activeNavKey}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
        onOpenAccount={() => setOverlay("user")}
      />
      <div className={cn("app-main", collapsed && "wide")}>
        <Header
          pageName={pageNames[page]}
          userName={currentUser}
          activeBranch={activeBranch}
          unreadCount={unreadCount}
          quickOpen={overlay === "quick"}
          branchOpen={overlay === "branch"}
          userOpen={overlay === "user"}
          onMobileMenu={() => setMobileNav(true)}
          onOpenSearch={() => setOverlay("search")}
          onToggleQuick={() => toggle("quick")}
          onOpenNotifications={() => setOverlay("notifications")}
          onToggleBranch={() => toggle("branch")}
          onToggleUser={() => toggle("user")}
        />
        <main className="content">
          {page === "dashboard" && (
            <DashboardPage
              activeBranch={activeBranch}
              onOpenModule={openModule}
              onQuickAction={quickAction}
              onOpenRecord={openRecordById}
            />
          )}
          {page === "leads" && (
            <LeadsPage
              intent={leadIntent}
              onIntentHandled={() => setLeadIntent(null)}
              focusLeadId={focusLeadId}
              onFocusHandled={() => setFocusLeadId(null)}
              onOpenCustomer={openCustomer}
            />
          )}
          {page === "customers" && (
            <CustomersPage
              intent={customerIntent}
              onIntentHandled={() => setCustomerIntent(null)}
              focusCustomerId={focusCustomerId}
              onFocusHandled={() => setFocusCustomerId(null)}
              onContextChange={(id, label) => setPageContext({ id, label })}
              onOpenLead={openLead}
              onOpenProduct={openProduct}
              onNewQuotation={customerId => createQuotation({ customerId })}
              onOpenQuotation={openQuotation}
              onOpenOrder={openOrder}
              onOpenReturn={openReturn}
              onOpenRepair={openRepair}
              onOpenFinanceDoc={openFinanceDoc}
              onOpenPostSales={() => navigate("post-sales")}
              onOpenCommunication={() => navigate("dispatch", "Communication", "dsp-comm")}
            />
          )}
          {page === "products" && (
            <ProductsPage
              intent={productIntent}
              onIntentHandled={() => setProductIntent(null)}
              focusProductId={focusProductId}
              onFocusHandled={() => setFocusProductId(null)}
              onCreateQuotation={productId => createQuotation({ productId })}
            />
          )}
          {page === "inventory" && (
            <InventoryPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              onOpenProduct={openProduct}
              intent={inventoryIntent}
              onIntentHandled={() => setInventoryIntent(null)}
            />
          )}
          {page === "quality" && (
            <QualityPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              focusReturnId={focusReturnId}
              focusInspectionId={focusInspectionId}
              onFocusHandled={() => {
                setFocusReturnId(null);
                setFocusInspectionId(null);
              }}
              onOpenCustomer={openCustomer}
              onOpenOrder={openOrder}
              onOpenProduct={openProduct}
              onOpenProduction={openProduction}
            />
          )}
          {page === "workshop" && (
            <WorkshopPage
              focusRepairId={focusRepairId}
              focusCustomOrderId={focusCustomOrderId}
              onFocusHandled={() => {
                setFocusRepairId(null);
                setFocusCustomOrderId(null);
              }}
              onOpenCustomer={openCustomer}
              onOpenProduct={openProduct}
              onOpenInspection={openInspection}
            />
          )}
          {page === "production" && (
            <ProductionPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              focusRecordId={focusProductionId ?? undefined}
              onOpenSalesOrder={openOrder}
              onOpenReturn={openReturn}
              onOpenDispatch={() => navigate("dispatch")}
            />
          )}
          {page === "dispatch" && (
            <DispatchPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              focusShipmentId={focusShipmentId}
              onFocusHandled={() => setFocusShipmentId(null)}
              onOpenOrder={openOrder}
              onOpenCustomer={openCustomer}
            />
          )}
          {page === "post-sales" && (
            <PostSalesPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              focusRecordId={focusPostSalesId ?? undefined}
              onFocusHandled={() => setFocusPostSalesId(null)}
              onOpenCustomer={openCustomer}
              onOpenOrder={openOrder}
            />
          )}
          {page === "reports" && (
            <ReportsPage onOpenCustomer={openCustomer} onOpenProduct={openProduct} onOpenOrder={openOrder} />
          )}
          {page === "admin" && (
            <AdminPage
              intent={adminIntent}
              onIntentHandled={() => setAdminIntent(null)}
              onOpenInternal={id => { setPage(id); setActiveNavKey(null); window.scrollTo(0, 0); }}
            />
          )}
          {page === "team" && (
            <TeamPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              intent={teamIntent}
              onIntentHandled={() => setTeamIntent(null)}
              onOpenLead={openLead}
              onOpenOrder={openOrder}
              onOpenTarget={target => navigate(target as PageId)}
              onOpenRecord={openRecordById}
            />
          )}
          {page === "finance" && (
            <FinancePage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              intent={financeIntent}
              onIntentHandled={() => setFinanceIntent(null)}
              focusDocId={focusFinanceDocId}
              onFocusHandled={() => setFocusFinanceDocId(null)}
              onOpenCustomer={openCustomer}
              onOpenOrder={openOrder}
              onOpenQuotation={openQuotation}
              onOpenReturn={openReturn}
              onOpenRepair={openRepair}
              onOpenCustomOrder={openCustomOrder}
            />
          )}
          {page === "purchase" && (
            <PurchasePage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              intent={purchaseIntent}
              onIntentHandled={() => setPurchaseIntent(null)}
              focusRecordId={focusPurchaseId}
              onFocusHandled={() => setFocusPurchaseId(null)}
              onCreateProduct={() => {
                setProductIntent("create");
                navigate("products");
              }}
            />
          )}
          {page === "sales" && (
            <SalesPage
              initialTab={pendingTab}
              onTabHandled={() => setPendingTab(null)}
              intent={salesIntent}
              onIntentHandled={() => setSalesIntent(null)}
              focusQuotationId={focusQuotationId}
              focusOrderId={focusOrderId}
              onFocusHandled={() => {
                setFocusQuotationId(null);
                setFocusOrderId(null);
              }}
              onOpenCustomer={openCustomer}
              onOpenProduct={openProduct}
              onOpenProduction={openProduction}
              onOpenShipment={openShipment}
              onOpenFinanceDoc={openFinanceDoc}
            />
          )}
          {page === "cover" && <CoverPage navigate={id => setPage(id)} activeBranch={activeBranch} />}
          {page === "foundations" && <FoundationsPage />}
          {page === "design-system" && <DesignSystemPage />}
          {page === "components" && <ComponentsPage />}
          {page === "authentication" && <AuthenticationPage onEnterWorkspace={signIn} onBackToCover={() => setPage("cover")} />}
          {page === "shell" && (
            <ShellPage
              actions={{
                search: () => setOverlay("search"),
                quick: () => setOverlay("quick"),
                notify: () => setOverlay("notifications"),
              }}
            />
          )}
        </main>
      </div>

      <CommandPalette
        open={overlay === "search"}
        onClose={close}
        onOpenCustomer={openCustomer}
        onOpenProduct={openProduct}
        onOpenQuotation={openQuotation}
        onOpenOrder={openOrder}
        records={searchIndex}
      />
      <MaharajaAi
        page={page}
        pageName={pageNames[page]}
        contextId={contextId ?? undefined}
        contextLabel={contextLabel ?? undefined}
        onNavigate={navigate}
        onOpenRecord={openRecordById}
      />
      <QuickCreate open={overlay === "quick"} onClose={close} onAction={quickAction} />
      <BranchSelector open={overlay === "branch"} activeBranchId={branchId} onSelect={selectBranch} onClose={close} />
      <UserMenu open={overlay === "user"} onClose={close} onItem={userAction} />
      <NotificationCenter
        open={overlay === "notifications"}
        onClose={close}
        notifications={notifications}
        onNotificationsChange={setNotifications}
        onViewAll={() => {
          setTeamIntent("notifications");
          navigate("team");
        }}
      />
      {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)} aria-hidden="true" />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CrmProvider>
        <ProductsProvider>
          <InventoryProvider>
            <SalesProvider>
              <PurchaseProvider>
                <QualityProvider>
                  <WorkshopProvider>
                    <ProductionProvider>
                    <PostSalesProvider>
                    <FinanceProvider>
                      <DispatchProvider>
                        <TeamProvider>
                          <AdminProvider>
                            <AppShell />
                          </AdminProvider>
                        </TeamProvider>
                      </DispatchProvider>
                    </FinanceProvider>
                    </PostSalesProvider>
                    </ProductionProvider>
                  </WorkshopProvider>
                </QualityProvider>
              </PurchaseProvider>
            </SalesProvider>
          </InventoryProvider>
        </ProductsProvider>
      </CrmProvider>
    </ToastProvider>
  );
}
