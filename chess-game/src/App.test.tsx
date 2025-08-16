import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders game lobby', () => {
  render(<App />);
  const lobbyElement = screen.getByText(/Lockstep Game Lobby/i);
  expect(lobbyElement).toBeInTheDocument();
});
