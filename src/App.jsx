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
    </Routes>
  );
}

export default App;