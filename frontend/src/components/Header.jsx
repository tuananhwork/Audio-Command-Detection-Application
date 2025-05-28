import React from 'react';
import PropTypes from 'prop-types';

const Header = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <div className="header">
      <h1 className="app__title">Audio Command Detector</h1>
      <button
        className="theme-toggle"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
};

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;
