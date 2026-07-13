import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../components/ui/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} title="Teste" onClose={() => {}}>
        Conteúdo
      </Modal>
    );
    expect(screen.queryByText("Conteúdo")).not.toBeInTheDocument();
  });

  it("renders the title and children when open", () => {
    render(
      <Modal open title="Teste" onClose={() => {}}>
        Conteúdo
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("calls onClose when ESC is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Teste" onClose={onClose}>
        Conteúdo
      </Modal>
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open title="Teste" onClose={onClose}>
        Conteúdo
      </Modal>
    );
    const backdrop = container.parentElement?.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();
    if (backdrop) {
      await userEvent.click(backdrop);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose via the close button", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Teste" onClose={onClose}>
        Conteúdo
      </Modal>
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
