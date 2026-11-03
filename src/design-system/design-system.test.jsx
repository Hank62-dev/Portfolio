import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Loading, Select, Skeleton, SkeletonLines } from './index';

const html = (node) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe('Button', () => {
  it('renders a <button> by default and a link for `to` / `href`', () => {
    expect(html(<Button>Go</Button>)).toMatch(/^<button type="button"/);
    expect(html(<Button to="/work">Go</Button>)).toMatch(/^<a [^>]*href="\/work"/);
    const external = html(<Button href="https://example.com">Go</Button>);
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');
    expect(html(<Button href="mailto:a@b.c">Mail</Button>)).not.toContain('target=');
  });

  it('disables itself and announces busy state while loading', () => {
    const markup = html(<Button loading>Save</Button>);
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
  });

  it('applies the size and variant classes', () => {
    expect(html(<Button size="icon" variant="secondary" aria-label="x" />)).toContain('size-9');
    expect(html(<Button variant="link">More</Button>)).not.toContain('min-h-');
  });
});

describe('Badge', () => {
  it('maps tones to colour classes and only draws a dot when asked', () => {
    expect(html(<Badge tone="ok">Up</Badge>)).toContain('text-ok');
    expect(html(<Badge tone="danger" dot>Down</Badge>)).toContain('bg-danger');
    expect(html(<Badge>Plain</Badge>)).not.toContain('<i ');
  });
});

describe('Field', () => {
  it('links the label, the control and the hint or error', () => {
    const withHint = html(<Field label="Name" hint="Your full name">{(props) => <Input {...props} />}</Field>);
    const id = withHint.match(/<label for="([^"]+)"/)[1];
    expect(withHint).toContain(`id="${id}"`);
    expect(withHint).toContain(`aria-describedby="${id}-hint"`);

    const withError = html(<Field label="Name" error="Required">{(props) => <Input {...props} />}</Field>);
    expect(withError).toContain('aria-invalid="true"');
    expect(withError).toMatch(/aria-describedby="[^"]+-error"/);
  });

  it('shows the chosen option on a menu button with a decorative chevron, not the browser list', () => {
    const markup = html(<Select value="b" aria-label="Pick"><option value="a">Alpha</option><option value="b">Beta</option></Select>);
    expect(markup).not.toContain('<select');
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-label="Pick"');
    expect(markup).toContain('Beta');
    expect(markup).not.toContain('Alpha');
    expect(markup).toContain('aria-hidden="true"');
  });
});

describe('feedback states', () => {
  it('announces errors as alerts and a loading region as a labelled, busy status', () => {
    expect(html(<ErrorState message="Boom" />)).toContain('role="alert"');
    const loading = html(<Loading label="Loading notes"><Skeleton /></Loading>);
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-label="Loading notes"');
  });

  it('draws skeletons that screen readers skip, with square corners unless told otherwise', () => {
    expect(html(<Skeleton />)).toContain('aria-hidden="true"');
    expect(html(<Skeleton />)).toContain('rounded-sm');
    expect(html(<Skeleton className="rounded-3xl h-4" />)).not.toContain('rounded-sm');
    expect((html(<SkeletonLines lines={3} />).match(/animate-pulse/g) ?? []).length).toBe(3);
  });

  it('shows a busy button as a pulsing bar over its hidden label', () => {
    const markup = html(<Button loading>Save</Button>);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled');
    expect(markup).toContain('invisible');
    expect(markup).toContain('animate-pulse');
    expect(html(<Button>Save</Button>)).not.toContain('animate-pulse');
  });

  it('shows the empty-state copy and action', () => {
    const markup = html(<EmptyState title="Nothing yet" description="Add one" action={<Button>Add</Button>} />);
    expect(markup).toContain('Nothing yet');
    expect(markup).toContain('Add one');
    expect(markup).toContain('<button');
  });
});
