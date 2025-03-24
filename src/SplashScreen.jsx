import React from 'react';
import Logo from './LearnLeaf_Logo_Circle.png'; // adjust path as needed
import './SplashScreen.css';

const SplashScreen = ({message}) => (
  <div className='splash-screen'>
    <img src={Logo} alt="LearnLeaf Logo" style={{ width: 120, height: 120, marginBottom: 20 }} />
    <p style={{ fontSize: '1.2rem', color: '#35584A' }}>{message || 'Loading LearnLeaf...'}</p>
  </div>
);

export default SplashScreen;
