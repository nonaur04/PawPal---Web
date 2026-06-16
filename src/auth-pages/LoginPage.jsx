import BrandingPanel from "../components/BrandingPanel";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="h-screen flex overflow-hidden">
      <BrandingPanel />
      <LoginForm />
    </div>
  );
}