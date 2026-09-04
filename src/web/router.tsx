import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { MapPage } from "./pages/Map";
import { RouteDetail } from "./pages/Route";
import { StopBoard } from "./pages/Stop";
import { Plan } from "./pages/Plan";
import { Trains } from "./pages/Trains";
import { Join } from "./pages/Join";
import { Group } from "./pages/Group";
import { Owner } from "./pages/Owner";
import { Drive } from "./pages/Drive";
import { About } from "./pages/About";
import { NotFound } from "./pages/NotFound";

// All 12 DESIGN.md §7 routes, declared once here. Nothing gets renamed.
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/route/:id" element={<RouteDetail />} />
        <Route path="/stop/:id" element={<StopBoard />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/trains" element={<Trains />} />
        <Route path="/join" element={<Join />} />
        <Route path="/g/:code" element={<Group />} />
        <Route path="/owner" element={<Owner />} />
        <Route path="/drive/:token" element={<Drive />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
