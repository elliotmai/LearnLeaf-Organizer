import React from 'react';
import Logo from './LearnLeaf_Logo_Circle.png'; // adjust path as needed

const SplashScreen = () => (
  <div style={{
    height: '100vh',
    backgroundColor: '#c1d4d2',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <img src={Logo} alt="LearnLeaf Logo" style={{ width: 120, height: 120, marginBottom: 20 }} />
    <p style={{ fontSize: '1.2rem', color: '#35584A' }}>Updating LearnLeaf...</p>
  </div>
);

export default SplashScreen;
