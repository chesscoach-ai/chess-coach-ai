"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export default class SectionErrorBoundary extends Component<{ children: ReactNode; title: string; message: string; action?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[Knightly] ${this.props.title}`, error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert" className="rounded-2xl border border-amber-800/70 bg-amber-950/25 p-5"><h2 className="font-black text-amber-100">{this.props.title}</h2><p className="mt-2 text-sm leading-6 text-amber-100/80">{this.props.message}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => this.setState({ failed: false })} className="rounded-xl border border-amber-700 px-4 py-2 text-sm font-bold text-amber-100">Réessayer</button>{this.props.action}</div></section>;
  }
}
