import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../components/ui/Button";

describe("Button", () => {
  it("renders the primary variant by default", () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button.className).toContain("fl-brand-primary-action");
  });

  it("renders the danger variant with rose classes (never red, see index.css brand override)", () => {
    render(<Button variant="danger">Excluir</Button>);
    const button = screen.getByRole("button", { name: "Excluir" });
    expect(button.className).toContain("rose");
    expect(button.className).not.toContain("bg-red-");
  });

  it("disables the button and shows a spinner while loading", () => {
    render(<Button loading>Enviando</Button>);
    const button = screen.getByRole("button", { name: "Enviando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Clique
      </Button>
    );
    await userEvent.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
