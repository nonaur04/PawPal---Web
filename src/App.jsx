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
import ShelterListingsPage from "./shelter-pages/ShelterListingsPage";
import ShelterPetDetailPage from "./shelter-pages/ShelterPetDetailPage";
import ShelterEditPetPage from "./shelter-pages/ShelterEditPetPage";
import ShelterApplicationsPage from "./shelter-pages/ShelterApplicationsPage";
import ShelterApplicationDetailPage from "./shelter-pages/ShelterApplicationDetailPage";
import ShelterStrayReportsPage from "./shelter-pages/ShelterStrayReportsPage";
import ShelterStrayReportDetailPage from "./shelter-pages/ShelterStrayReportDetailPage";
import ShelterLostPetsPage from "./shelter-pages/ShelterLostPetsPage";
import ShelterLostReportDetailPage from "./shelter-pages/ShelterLostReportDetailPage";
import ShelterVetNearMePage from "./shelter-pages/ShelterVetNearMePage";
import ShelterMessagesPage from "./shelter-pages/ShelterMessagesPage";
import ShelterProfilePage from "./shelter-pages/ShelterProfilePage";
import ShelterSettingsPage from "./shelter-pages/ShelterSettingsPage";

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
      <Route path="/shelter/listings" element={<ShelterListingsPage />} />
      <Route path="/shelter/listings/:id" element={<ShelterPetDetailPage />} />
      <Route path="/shelter/edit-pet/:id" element={<ShelterEditPetPage />} />
      <Route path="/shelter/applications" element={<ShelterApplicationsPage />} />
      <Route path="/shelter/applications/:id" element={<ShelterApplicationDetailPage />} />
      <Route path="/shelter/stray-reports" element={<ShelterStrayReportsPage />} />
      <Route path="/shelter/stray-reports/:id" element={<ShelterStrayReportDetailPage />} />
      <Route path="/shelter/lost-pets" element={<ShelterLostPetsPage />} />
      <Route path="/shelter/lost-pets/:id" element={<ShelterLostReportDetailPage />} />
      <Route path="/shelter/vet-near-me" element={<ShelterVetNearMePage />} />
      <Route path="/shelter/messages" element={<ShelterMessagesPage />} />
      <Route path="/shelter/profile" element={<ShelterProfilePage />} />
      <Route path="/shelter/settings" element={<ShelterSettingsPage />} />
    </Routes>
  );
}

export default App;