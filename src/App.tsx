/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './pages/Menu';
import Admin from './pages/Admin';
import { DialogProvider } from './context/DialogContext';

export default function App() {
  return (
    <DialogProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </DialogProvider>
  );
}
