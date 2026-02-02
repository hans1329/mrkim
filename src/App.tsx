import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ChatProvider } from "@/contexts/ChatContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
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
// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ChatProvider>
            <VoiceProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/intro" element={<PreLoginLanding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/funds" element={<Funds />} />
                <Route path="/more" element={<More />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/financial-services" element={<FinancialServices />} />
                <Route path="/pitchdeck" element={<PitchDeck />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/secretary-settings" element={<SecretarySettings />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/design" element={<DesignGuide />} />
                <Route path="/engine" element={<Engine />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/faq" element={<AdminFAQ />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </VoiceProvider>
          </ChatProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
