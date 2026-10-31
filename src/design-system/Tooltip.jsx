import * as RadixTooltip from '@radix-ui/react-tooltip';

/** Wrap an app area once; every <Tooltip> inside shares the open/close delays. */
export const TooltipProvider = ({ children }) => (
  <RadixTooltip.Provider delayDuration={250} skipDelayDuration={150}>
    {children}
  </RadixTooltip.Provider>
);

/** Shows `content` on hover and keyboard focus of its single child. Use it for icon-only controls. */
export const Tooltip = ({ content, side = 'right', disabled = false, children }) => {
  if (disabled || !content) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="z-50 animate-fade-in rounded-sm border border-line-strong bg-ink-2 px-2.5 py-1.5 font-mono text-fine text-bone shadow-pop"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
