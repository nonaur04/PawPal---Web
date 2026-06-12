import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import PetDetailPage from "./pages/PetDetailPage";
import AdoptionIntroPage from "./pages/AdoptionIntroPage";
import AdoptionFormPage from "./pages/AdoptionFormPage";
import PostPetPage from "./pages/PostPetPage";
import MyPetDetailPage from "./pages/MyPetDetailPage";
import EditPetPage from "./pages/EditPetPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import BrowseAllPetsPage from "./pages/BrowseAllPetsPage";
import ReportsPage from "./pages/ReportsPage";
import MyStrayReportsPage from "./pages/MyStrayReportsPage";
import AllStrayReportsPage from "./pages/AllStrayReportsPage";
import MyLostPetsPage from "./pages/MyLostPetsPage";
import AllLostPetsPage from "./pages/AllLostPetsPage";
import NewStrayReportPage from "./pages/NewStrayReportPage";
import NewLostReportPage from "./pages/NewLostReportPage";
import StrayReportDetailPage from "./pages/StrayReportDetailPage";
import LostReportDetailPage from "./pages/LostReportDetailPage";
import EditLostReportPage from "./pages/EditLostReportPage";
import MessagesPage from "./pages/MessagesPage";
import VetNearMePage from "./pages/VetNearMePage";
import ReviewApplicantPage from "./pages/ReviewApplicantPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
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
    </Routes>
  );
}

export default App;