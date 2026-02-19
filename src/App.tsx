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
import Onboarding from "./pages/Onboarding";
import DesignGuide from "./pages/DesignGuide";
import Engine from "./pages/Engine";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ConnectionProvider>
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
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/faq" element={<AdminFAQ />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                      <Route path="/admin/push" element={<AdminPush />} />
                      <Route path="/admin/feedback" element={<AdminFeedback />} />
                      <Route path="/admin/api-usage" element={<AdminApiUsage />} />
                      <Route path="/admin/site-settings" element={<AdminSiteSettings />} />

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
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/design" element={<DesignGuide />} />
                        <Route path="/engine" element={<Engine />} />
                        <Route path="/community" element={<Community />} />
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
