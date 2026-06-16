import { Routes, Route } from "react-router-dom";

// Auth
import LoginPage from "./auth-pages/LoginPage";
import SignUpPage from "./auth-pages/SignUpPage";

// Normal User
import HomePage from "./user-pages/HomePage";
import PetDetailPage from "./user-pages/PetDetailPage";
import AdoptionIntroPage from "./user-pages/AdoptionIntroPage";
import AdoptionFormPage from "./user-pages/AdoptionFormPage";
import PostPetPage from "./user-pages/PostPetPage";
import MyPetDetailPage from "./user-pages/MyPetDetailPage";
import EditPetPage from "./user-pages/EditPetPage";
import MyApplicationsPage from "./user-pages/MyApplicationsPage";
import ApplicationDetailPage from "./user-pages/ApplicationDetailPage";
import BrowseAllPetsPage from "./user-pages/BrowseAllPetsPage";
import ReportsPage from "./user-pages/ReportsPage";
import MyStrayReportsPage from "./user-pages/MyStrayReportsPage";
import AllStrayReportsPage from "./user-pages/AllStrayReportsPage";
import MyLostPetsPage from "./user-pages/MyLostPetsPage";
import AllLostPetsPage from "./user-pages/AllLostPetsPage";
import NewStrayReportPage from "./user-pages/NewStrayReportPage";
import NewLostReportPage from "./user-pages/NewLostReportPage";
import StrayReportDetailPage from "./user-pages/StrayReportDetailPage";
import LostReportDetailPage from "./user-pages/LostReportDetailPage";
import EditLostReportPage from "./user-pages/EditLostReportPage";
import MessagesPage from "./user-pages/MessagesPage";
import VetNearMePage from "./user-pages/VetNearMePage";
import ReviewApplicantPage from "./user-pages/ReviewApplicantPage";
import ProfilePage from "./user-pages/ProfilePage";
import SettingsPage from "./user-pages/SettingsPage";

// Shelter
import ShelterDashboardPage from "./shelter-pages/ShelterDashboardPage";
import ShelterPostPetPage from "./shelter-pages/ShelterPostPetPage";

function App() {
  return (
    <Routes>

      // Auth
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<SignUpPage />} />

      // Normal User
      <Route path="/home" element={<HomePage />} />
      <Route path="/pet/:id" element={<PetDetailPage />} />
      <Route path="/adopt-intro/:id/:petName" element={<AdoptionIntroPage />} />
      <Route path="/apply/:id/:petName" element={<AdoptionFormPage />} />
      <Route path="/post-pet" element={<PostPetPage />} />
      <Route path="/my-pet/:id" element={<MyPetDetailPage />} />
      <Route path="/edit-pet/:id" element={<EditPetPage />} />
      <Route path="/applications" element={<MyApplicationsPage />} />
      <Route path="/application/:id" element={<ApplicationDetailPage />} />
      <Route path="/browse" element={<BrowseAllPetsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/reports/my-strays" element={<MyStrayReportsPage />} />
      <Route path="/reports/all-strays" element={<AllStrayReportsPage />} />
      <Route path="/reports/my-lost" element={<MyLostPetsPage />} />
      <Route path="/reports/all-lost" element={<AllLostPetsPage />} />
      <Route path="/reports/new-stray" element={<NewStrayReportPage />} />
      <Route path="/reports/new-lost" element={<NewLostReportPage />} />
      <Route path="/reports/stray/:id" element={<StrayReportDetailPage />} />
      <Route path="/reports/lost/:id" element={<LostReportDetailPage />} />
      <Route path="/reports/edit-lost/:id" element={<EditLostReportPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/vet-near-me" element={<VetNearMePage />} />
      <Route path="/review-applicant/:id" element={<ReviewApplicantPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />

      // Shelter
      <Route path="/shelter/dashboard" element={<ShelterDashboardPage />} />
      <Route path="/shelter/post-pet" element={<ShelterPostPetPage />} />
      
    </Routes>
  );
}

export default App;