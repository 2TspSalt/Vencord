/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary, { type Props as ErrorBoundaryProps } from "@components/ErrorBoundary";
import { useMemo } from "@webpack/common";
import type { ReactNode } from "react";

export type ToolbarComponent = () => JSX.Element;
export type ToolbarErrorProps = Omit<ErrorBoundaryProps, 'wrappedProps'>;
export interface ToolbarButton {
    Component: ToolbarComponent,
    position?: number;
    errorProps?: ToolbarErrorProps;
}

export const toolbarButtons = new Map<string, ToolbarButton>;

export function addToolbarButton(identifier: string, toolbarButton: ToolbarButton) {
    toolbarButtons.set(identifier, toolbarButton);
}

export function removeToolbarButton(identifier: string) {
    toolbarButtons.delete(identifier);
}

function mergeToolbarButtons(elements: ReactNode[]): ReactNode[] {
    for (const { Component, position, errorProps = { noop: true } } of toolbarButtons.values()) {
        const resolvedPosition =
            position !== undefined
                ? position < 0
                    ? elements.length + position
                    : position
                : elements.length;
        const WrappedComponent: ReactNode = <ErrorBoundary {...errorProps}><Component /></ErrorBoundary>;
        elements.splice(resolvedPosition, 0, WrappedComponent);
    }
    return elements;
}

export const ToolbarWrapper = ErrorBoundary.wrap(function ToolboxWrapper({ children }: { children: ReactNode[]; }) {
    // const mergedChildren = useMemo(() => mergeToolbarButtons(children), [children, ...toolbarButtons.values()]);
    const mergedChildren = mergeToolbarButtons(children);
    console.debug(mergedChildren);
    return <>{mergedChildren}</>;
}, {
    fallback: () => <p style={{ color: "red" }}>Failed to render :(</p>
});
