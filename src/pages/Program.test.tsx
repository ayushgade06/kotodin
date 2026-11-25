import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LangProvider } from '../i18n';
import { ToastProvider } from '../components/Toast';
import { ProgramProvider } from '../state/ProgramContext';
import { buildDemoProgram } from '../seed/demoProgram';
import { unpackWells } from '../data/parseWells';
import { derive } from '../state/derive';
import { STORAGE_KEY } from '../state/store';
import { todayISO, visitQueue } from '../engine';
import Program from './Program';

vi.mock('../components/maps', () => ({ ProgramMap: () => null, WellsMap: () => null }));

describe('Program dashboard', () => {
  it('renders the visit queue in exactly the engine’s priority order', () => {
    const wells = unpackWells(JSON.parse(readFileSync('public/data/wells.json', 'utf8')));
    const state = buildDemoProgram(wells, todayISO());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(
      <LangProvider><ToastProvider><MemoryRouter><ProgramProvider><Program /></ProgramProvider></MemoryRouter></ToastProvider></LangProvider>,
    );
    const expected = visitQueue(derive(state, todayISO()).rows).map(i => i.row.code);
    const items = within(screen.getByRole('list', { name: 'Visit queue' })).getAllByRole('listitem');
    expect(items.map(li => /HH-\d{3}/.exec(li.textContent ?? '')?.[0])).toEqual(expected);
    expect(expected.length).toBeGreaterThan(5);
  });
});
