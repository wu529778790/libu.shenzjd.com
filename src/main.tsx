import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./app/globals.css";

// 页面组件
import Home from "./app/page";
import Setup from "./app/setup/page";
import Main from "./app/main/page";
import GuestScreen from "./app/guest-screen/page";
import TestData from "./app/test-data/page";
import NotFound from "./app/not-found";

// Toast 组件
import { ToastContainer } from "./components/ui/Toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/main" element={<Main />} />
        <Route path="/guest-screen" element={<GuestScreen />} />
        <Route path="/test-data" element={<TestData />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
    <ToastContainer />
  </React.StrictMode>
);
