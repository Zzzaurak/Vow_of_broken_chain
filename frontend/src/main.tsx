import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StartPage } from './pages/StartPage';
import { GamePage } from './pages/GamePage';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route path="/" element={<StartPage/>}/><Route path="/game" element={<GamePage/>}/></Routes></BrowserRouter></React.StrictMode>);
