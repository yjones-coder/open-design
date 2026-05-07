// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatComposer } from '../../src/components/ChatComposer';

describe('ChatComposer /search command', () => {
  it('expands /search into a first-action research command prompt', () => {
    const onSend = vi.fn();

    render(
      <ChatComposer
        projectId="project-1"
        projectFiles={[]}
        streaming={false}
        researchAvailable
        onEnsureProject={async () => 'project-1'}
        onSend={onSend}
        onStop={vi.fn()}
      />,
    );

    const input = screen.getByTestId('chat-composer-input');
    fireEvent.change(input, { target: { value: '/search EV market 2025 trends' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    expect(onSend).toHaveBeenCalledTimes(1);
    const [prompt, attachments, commentAttachments, meta] = onSend.mock.calls[0]!;
    expect(prompt).toContain(
      'Before answering, your first tool action must be this OD research command:',
    );
    expect(prompt).toContain(
      'node "$OD_BIN" research search --query "EV market 2025 trends" --max-sources 5',
    );
    expect(prompt).toContain(
      'If the OD command fails because Tavily is not configured or unavailable',
    );
    expect(prompt).toContain(
      'use your own search capability as fallback and label the fallback clearly',
    );
    expect(attachments).toEqual([]);
    expect(commentAttachments).toEqual([]);
    expect(meta).toEqual({
      research: { enabled: true, query: 'EV market 2025 trends' },
    });
  });
});
