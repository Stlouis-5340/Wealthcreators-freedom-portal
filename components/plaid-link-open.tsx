"use client";

import { useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";

export function PlaidLinkOpen({
  token,
  onPublicToken,
  onExit,
}: {
  token: string;
  onPublicToken: (publicToken: string) => void;
  onExit: (message: string | null) => void;
}) {
  const opened = useRef(false);
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      if (publicToken) onPublicToken(publicToken);
    },
    onExit: (error) => {
      onExit(error ? error.display_message || "Plaid Link closed before the account was connected." : null);
    },
  });

  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    open();
  }, [open, ready]);

  return null;
}
