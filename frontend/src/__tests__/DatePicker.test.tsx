import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../components/ui/DatePicker";

describe("DatePicker", () => {
  it("displays an ISO value in dd/mm/yyyy format", () => {
    render(<DatePicker label="Data" value="2025-06-15" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("15/06/2025");
  });

  it("shows an empty field for an empty value", () => {
    render(<DatePicker label="Data" value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("calls onChange with the ISO value once a full dd/mm/yyyy date is typed", async () => {
    const onChange = vi.fn();
    render(<DatePicker label="Data" value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "15062025");
    expect(onChange).toHaveBeenCalledWith("2025-06-15");
  });

  it("shows the error message when provided", () => {
    render(<DatePicker label="Data" value="" onChange={() => {}} error="Campo obrigatório" />);
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument();
  });
});
