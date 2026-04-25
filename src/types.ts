import { 
  LayoutDashboard, 
  Smartphone, 
  Network, 
  ScrollText, 
  Bell, 
  Calendar, 
  Search, 
  Plus, 
  X, 
  Lock, 
  Banknote, 
  Building2, 
  Wallet, 
  User, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowRight,
  MoreVertical,
  History,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Store,
  Laptop,
  Headphones,
  Watch,
  Menu,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Send,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  UserPlus,
  LayoutGrid,
  Shield,
  Filter,
  ScanLine
} from 'lucide-react';

export const Icons = {
  Dashboard: LayoutDashboard,
  Vault: Smartphone,
  Network: Network,
  Ledger: ScrollText,
  Notifications: Bell,
  Calendar: Calendar,
  Search: Search,
  Plus: Plus,
  Close: X,
  Smartphone: Smartphone,
  Lock: Lock,
  Cash: Banknote,
  Bank: Building2,
  Wallet: Wallet,
  User: User,
  CheckCircle: CheckCircle2,
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  Package: Package,
  ArrowRight: ArrowRight,
  MoreVertical: MoreVertical,
  History: History,
  Warning: AlertTriangle,
  LogOut: LogOut,
  Shield: ShieldCheck,
  Store: Store,
  Laptop: Laptop,
  Headphones: Headphones,
  Watch: Watch,
  Menu: Menu,
  ArrowUpRight: ArrowUpRight,
  ArrowDownLeft: ArrowDownLeft,
  Info: Info,
  Send: Send,
  ShoppingCart: ShoppingCart,
  NewSale: ShoppingCart,
  LogPurchase: Package,
  LendPhone: ArrowLeftRight,
  Receipt: Receipt,
  Security: Shield,
  ArrowLeftRight: ArrowLeftRight,
  Sales: ShoppingCart,
  Items: Package,
  Employee: User,
  Hierarchy: Shield,
  Invite: UserPlus,
  DashboardGrid: LayoutGrid,
  Filter: Filter,
  QRCode: ScanLine
};

export type Screen = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'VAULT_DASHBOARD' // Old dashboard
  | 'BANK' 
  | 'LOANS' 
  | 'SALES' 
  | 'SALES_MANAGER' 
  | 'ITEMS' 
  | 'WAREHOUSE' 
  | 'EMPLOYEE' 
  | 'ROLE_HIERARCHY'
  | 'VAULT' 
  | 'NETWORK' 
  | 'LEDGER' 
  | 'EXPENSE' 
  | 'RECONCILE' 
  | 'AUDIT' 
  | 'INVITE' 
  | 'PURCHASE' 
  | 'LEND' 
  | 'TRANSFER' 
  | 'SALE' 
  | 'PROFILE' 
  | 'DEBTS' 
  | 'NOTIFICATIONS' 
  | 'ONBOARDING';

export interface Transaction {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'LENT' | 'BORROWED' | 'EXPENSE' | 'VOID' | 'RETURNED' | 'TRANSFER' | 'LOAN' | 'REPAYMENT';
  item: string;
  amount: number;
  timestamp: string;
  clerk: string;
  clerkId?: string;
  status: 'SETTLED' | 'PENDING' | 'VOIDED' | 'COMPLETED' | 'IN_TRANSIT' | 'APPROVED';
  imei?: string;
  location?: string;
  source?: string;
  direction?: 'SEND' | 'RECEIVE';
  transferType?: 'ASSET' | 'CASH';
}

export interface InventoryItem {
  id: string;
  name: string;
  imei: string;
  purchasePrice: number;
  valuation: number;
  status: 'IN_STOCK' | 'LENT' | 'SOLD' | 'SOLD_BY_RECIPIENT' | 'PENDING_APPROVAL';
  category: 'PHONES' | 'TABLETS' | 'ACCESSORIES';
  branch?: string;
  warehouseId?: string;
  isApproved?: boolean;
  lentTo?: string;
  expectedReturnDate?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  color: string;
  ownerId: string; // 'STORE' or userId
  type: 'STORE' | 'EMPLOYEE';
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  amount: number;
  activity: string;
  project: string;
  to: string;
  date: string;
}

export interface Loan {
  id: string;
  type: 'GIVEN' | 'RECEIVED';
  counterparty: string;
  contactId?: string;
  amount: number;
  bankAccountId?: string;
  status: 'OUTSTANDING' | 'SETTLED';
  date: string;
  dueDate?: string;
  notes?: string;
  organizationId?: string;
}

export interface Contact {
  id: string;
  organizationId?: string;
  name: string;
  type: 'VENDOR' | 'CUSTOMER' | 'BOTH';
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'SALE', item: 'iPhone 15 Pro Max', amount: 145000, timestamp: '2023-10-24 14:22:10', clerk: 'Abebe Kebede', status: 'SETTLED', imei: '354678229103445' },
  { id: '2', type: 'EXPENSE', item: 'Electricity Bill', amount: -1250, timestamp: '2023-10-24 13:45:02', clerk: 'Sara Tesfaye', status: 'PENDING' },
  { id: '3', type: 'VOID', item: 'Void Entry #8812', amount: 0, timestamp: '2023-10-24 11:10:55', clerk: 'Abebe Kebede', status: 'VOIDED' },
  { id: '4', type: 'SALE', item: 'Samsung S23 Ultra', amount: 68000, timestamp: '2023-10-24 10:30:11', clerk: 'Dawit Mengistu', status: 'SETTLED', imei: '123456789012345' },
  { id: '5', type: 'EXPENSE', item: 'Office Supplies', amount: -4100, timestamp: '2023-10-24 09:15:44', clerk: 'Sara Tesfaye', status: 'SETTLED' },
  { id: '6', type: 'PURCHASE', item: 'iPhone 15 Pro Max', amount: -120000, timestamp: '2023-10-20 09:00:00', clerk: 'Admin', status: 'SETTLED', imei: '354678229103445' },
  { id: '7', type: 'LENT', item: 'iPhone 15 Pro Max', amount: 0, timestamp: '2023-10-22 10:00:00', clerk: 'Abebe Kebede', status: 'COMPLETED', imei: '354678229103445', location: 'Bole Branch' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'iPhone 15 Pro Max', imei: '354678229103445', purchasePrice: 120000, valuation: 145000, status: 'IN_STOCK', category: 'PHONES' },
  { id: '2', name: 'Samsung Galaxy S24', imei: '442312998001231', purchasePrice: 95000, valuation: 110000, status: 'LENT', category: 'PHONES' },
  { id: '3', name: 'Google Pixel 8', imei: '998765213456789', purchasePrice: 75000, valuation: 85000, status: 'IN_STOCK', category: 'PHONES' },
  { id: '4', name: 'Huawei P60', imei: '554321110987654', purchasePrice: 55000, valuation: 65000, status: 'SOLD', category: 'PHONES' },
];
