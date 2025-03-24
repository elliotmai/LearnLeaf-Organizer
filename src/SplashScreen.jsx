import React from 'react';
import Logo from './LearnLeaf_Logo_Circle.png'; // adjust path as needed

const SplashScreen = ({message}) => (
  <div style={{
    height: '100vh',
    width: '100vw',
    backgroundColor: '#c1d4d2',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <img src={Logo} alt="LearnLeaf Logo" style={{ width: 120, height: 120, marginBottom: 20 }} />
    <p style={{ fontSize: '1.2rem', color: '#35584A' }}>{message || 'Loading LearnLeaf...'}</p>
  </div>
);

export default SplashScreen;
