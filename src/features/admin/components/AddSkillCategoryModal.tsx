import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { FormInputField } from "../../../shared/components/FormInputField";
import { ModalShell } from "../../../shared/components/ModalShell";
import { sanitizeText } from "../../../shared/lib/validation";

type AddSkillCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (categoryName: string) => void;
  initialValue?: string;
  title?: string;
  saveLabel?: string;
};

export function AddSkillCategoryModal({
  open,
  onClose,
  onSave,
  initialValue,
  title = "Add New Skill Category",
  saveLabel = "Save"
}: AddSkillCategoryModalProps) {
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCategory(initialValue ?? "");
      setError("");
    }
  }, [open, initialValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = sanitizeText(category, 120);

    if (!value) {
      setError("Category is required.");
      return;
    }

    onSave(value);
    setCategory("");
    setError("");
    onClose();
  };

  return (
    <ModalShell open={open} title={title} onClose={onClose} maxWidthClassName="max-w-[560px]" showHeaderDivider={false}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormInputField
          label="Category"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setError("");
          }}
          error={error}
        />

        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="h-9 w-full" type="submit">
            {saveLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
