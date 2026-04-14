import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatProvider } from "@/contexts/ChatContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { ConnectionDrawerProvider } from "@/contexts/ConnectionDrawerContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LayoutRoute } from "@/components/layout/LayoutRoute";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Index from "./pages/Index";
import PreLoginLanding from "./pages/PreLoginLanding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Transactions from "./pages/Transactions";
import Employees from "./pages/Employees";
import Funds from "./pages/Funds";
import More from "./pages/More";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import FinancialServices from "./pages/FinancialServices";
import PitchDeck from "./pages/PitchDeck";
import Landing from "./pages/Landing";
import SecretarySettings from "./pages/SecretarySettings";

import DesignGuide from "./pages/DesignGuide";
import Engine from "./pages/Engine";
import MktEngine from "./pages/MktEngine";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";
import Help from "./pages/Help";
import TaxAccountant from "./pages/TaxAccountant";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ResetPassword from "./pages/ResetPassword";
import V2Dashboard from "./pages/V2Dashboard";
// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminPush from "./pages/admin/AdminPush";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminApiUsage from "./pages/admin/AdminApiUsage";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminIntentKeywords from "./pages/admin/AdminIntentKeywords";
import AdminTaxAccountants from "./pages/admin/AdminTaxAccountants";
import AdminEmail from "./pages/admin/AdminEmail";
// Accountant portal
import AccountantLogin from "./pages/accountant/AccountantLogin";
import AccountantSignup from "./pages/accountant/AccountantSignup";
import AccountantDashboard from "./pages/accountant/AccountantDashboard";
import AccountantClients from "./pages/accountant/AccountantClients";
import AccountantConsultations from "./pages/accountant/AccountantConsultations";
import AccountantFilings from "./pages/accountant/AccountantFilings";
import { AccountantLayout } from "./components/accountant/AccountantLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5분 기본 fresh
      gcTime: 1000 * 60 * 30,         // 30분 캐시 유지
      refetchOnWindowFocus: false,    // 포커스 시 자동 refetch 비활성화
      retry: 1,                       // 실패 시 1회 재시도
      refetchOnReconnect: true,       // 네트워크 복구 시 refetch
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ConnectionProvider>
              <ScrollToTop />
              <ConnectionDrawerProvider>
                <ChatProvider>
                  <VoiceProvider>
                    <Routes>
                      {/* 레이아웃 없는 독립 페이지 */}
                      <Route path="/intro" element={<PreLoginLanding />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/pitchdeck" element={<PitchDeck />} />
                      <Route path="/landing" element={<Landing />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/v2" element={<V2Dashboard />} />
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/faq" element={<AdminFAQ />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                      <Route path="/admin/push" element={<AdminPush />} />
                      <Route path="/admin/feedback" element={<AdminFeedback />} />
                      <Route path="/admin/api-usage" element={<AdminApiUsage />} />
                      <Route path="/admin/intent-keywords" element={<AdminIntentKeywords />} />
                      <Route path="/admin/site-settings" element={<AdminSiteSettings />} />
                      <Route path="/admin/tax-accountants" element={<AdminTaxAccountants />} />
                      <Route path="/admin/email" element={<AdminEmail />} />
                      {/* Accountant Portal Routes */}
                      <Route path="/accountant/login" element={<AccountantLogin />} />
                      <Route path="/accountant/signup" element={<AccountantSignup />} />
                      <Route path="/accountant" element={<AccountantLayout />}>
                        <Route index element={<AccountantDashboard />} />
                        <Route path="clients" element={<AccountantClients />} />
                        <Route path="consultations" element={<AccountantConsultations />} />
                        <Route path="filings" element={<AccountantFilings />} />
                      </Route>

                      {/* 공통 레이아웃 적용 페이지 */}
                      <Route element={<LayoutRoute />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/funds" element={<Funds />} />
                        <Route path="/more" element={<More />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/financial-services" element={<FinancialServices />} />
                        <Route path="/secretary-settings" element={<SecretarySettings />} />
                        
                        <Route path="/design" element={<DesignGuide />} />
                        <Route path="/engine" element={<Engine />} />
                        <Route path="/mkt-engine" element={<MktEngine />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="/tax-accountant" element={<TaxAccountant />} />
                      </Route>

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </VoiceProvider>
                </ChatProvider>
              </ConnectionDrawerProvider>
            </ConnectionProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
