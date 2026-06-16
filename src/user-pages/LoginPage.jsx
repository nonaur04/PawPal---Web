import BrandingPanel from "../components/BrandingPanel";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <BrandingPanel />
      <LoginForm />
    </div>
  );
}