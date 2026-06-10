import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import PetDetailPage from "./pages/PetDetailPage";
import AdoptionIntroPage from "./pages/AdoptionIntroPage";
import AdoptionFormPage from "./pages/AdoptionFormPage";
import PostPetPage from "./pages/PostPetPage";
import MyPetDetailPage from "./pages/MyPetDetailPage";
import EditPetPage from "./pages/EditPetPage";

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
    </Routes>
  );
}

export default App;