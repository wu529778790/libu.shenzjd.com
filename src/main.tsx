import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './app/globals.css'

// 页面组件
import Home from './app/page'
import Setup from './app/setup/page'
import Main from './app/main/page'
import GuestScreen from './app/guest-screen/page'
import TestData from './app/test-data/page'
import TestRedirect from './app/test-redirect/page'
import NotFound from './app/not-found'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/main" element={<Main />} />
        <Route path="/guest-screen" element={<GuestScreen />} />
        <Route path="/test-data" element={<TestData />} />
        <Route path="/test-redirect" element={<TestRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
