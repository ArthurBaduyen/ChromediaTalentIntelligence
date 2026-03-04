import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { FormInputField } from "../../../shared/components/FormInputField";
import { ChevronDownIcon } from "../../../shared/components/Icons";
import { ModalShell } from "../../../shared/components/ModalShell";
import { CandidateRecord, NewCandidateInput } from "../data/candidatesDb";
import {
  digitsOnly,
  isValidEmail,
  isValidPhilippinesMobile,
  parsePositiveAmount,
  sanitizeText
} from "../../../shared/lib/validation";

type RateType = "Hourly" | "Daily" | "Monthly";

type CandidateForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  address: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
  iMessage: string;
  position: string;
  contract: string;
  expectedSalary: string;
  offeredSalary: string;
  expectedRate: RateType;
  offeredRate: RateType;
};

type AddCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  onAddCandidate?: (candidate: NewCandidateInput) => void;
  mode?: "add" | "edit";
  initialCandidate?: CandidateRecord | null;
};

type FieldName = keyof CandidateForm;
type StringFieldName = Exclude<FieldName, "expectedRate" | "offeredRate">;
type ErrorMap = Partial<Record<FieldName, string>>;
type CvExtractedData = Partial<CandidateForm> & { extractedName?: string };

const RATE_OPTIONS: RateType[] = ["Hourly", "Daily", "Monthly"];

const baseInitialForm: CandidateForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  contactNumber: "",
  email: "",
  address: "",
  city: "",
  region: "",
  zipCode: "",
  country: "Philippines",
  iMessage: "",
  position: "",
  contract: "",
  expectedSalary: "1,000.00",
  offeredSalary: "1,000.00",
  expectedRate: "Hourly",
  offeredRate: "Hourly"
};

const requiredFields: FieldName[] = [
  "firstName",
  "lastName",
  "contactNumber",
  "email",
  "address",
  "city",
  "region",
  "zipCode",
  "country",
  "position",
  "contract",
  "expectedSalary",
  "offeredSalary"
];

function formatPhilippinesNumber(rawDigits: string) {
  const digits = rawDigits.replace(/\D/g, "").slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean);
  return parts.join(" ");
}

function parseSalary(value: string) {
  const amountMatch = value.match(/\$?\s*([\d,.]+)/);
  const rateMatch = value.match(/\/\s*(Hour|Day|Month|Hourly|Daily|Monthly)/i);
  const rateRaw = (rateMatch?.[1] ?? "Hourly").toLowerCase();
  const rate: RateType = rateRaw.startsWith("day") ? "Daily" : rateRaw.startsWith("month") ? "Monthly" : "Hourly";
  return {
    amount: amountMatch?.[1] ?? "1,000.00",
    rate
  };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", middleName: "", lastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

function autoFillMissingWithExtracted(base: CandidateForm, extracted: CvExtractedData): CandidateForm {
  const next = { ...base };
  const assignIfPresent = (field: StringFieldName) => {
    const value = extracted[field];
    if (typeof value === "string" && value.trim()) {
      next[field] = value as CandidateForm[StringFieldName];
    }
  };

  assignIfPresent("firstName");
  assignIfPresent("middleName");
  assignIfPresent("lastName");
  assignIfPresent("contactNumber");
  assignIfPresent("email");
  assignIfPresent("address");
  assignIfPresent("city");
  assignIfPresent("region");
  assignIfPresent("zipCode");
  assignIfPresent("country");
  assignIfPresent("iMessage");
  assignIfPresent("position");
  assignIfPresent("contract");
  assignIfPresent("expectedSalary");
  assignIfPresent("offeredSalary");

  if (extracted.expectedRate) next.expectedRate = extracted.expectedRate;
  if (extracted.offeredRate) next.offeredRate = extracted.offeredRate;

  return next;
}

function extractCvDataFromText(rawText: string): CvExtractedData {
  const text = rawText.replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(?:\+?63|0)?\s*9\d{2}[\s-]?\d{3}[\s-]?\d{4}/);
  const salaryMatch = text.match(/\$?\s*([\d,.]+)\s*\/\s*(hour|day|month|hourly|daily|monthly)/i);
  const zipMatch = text.match(/\b\d{4}\b/);

  const roleLine = lines.find((line) =>
    /(engineer|developer|designer|qa|tester|architect|manager|analyst|devops|sre|product)/i.test(line)
  );
  const locationLine = lines.find((line) => /(philippines|cebu|manila|davao|quezon|makati|taguig)/i.test(line));
  const addressLine = lines.find((line) => /(street|st\.|road|rd\.|avenue|ave\.|barangay|brgy)/i.test(line));
  const contractLine = lines.find((line) => /(full[- ]time|part[- ]time|contract|freelance)/i.test(line));

  const inferredNameLine = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,}$/.test(line) && line.split(/\s+/).length <= 4);
  const nameParts = splitName(inferredNameLine ?? "");

  const rateRaw = (salaryMatch?.[2] ?? "").toLowerCase();
  const rate: RateType | undefined = rateRaw
    ? rateRaw.startsWith("day")
      ? "Daily"
      : rateRaw.startsWith("month")
        ? "Monthly"
        : "Hourly"
    : undefined;

  return {
    extractedName: inferredNameLine,
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    email: emailMatch?.[0] ?? "",
    contactNumber: phoneMatch ? formatPhilippinesNumber(digitsOnly(phoneMatch[0]).slice(-10)) : "",
    address: addressLine ?? "",
    city: locationLine?.split(",")[0]?.trim() ?? "",
    region: locationLine?.split(",")[1]?.trim() ?? "",
    zipCode: zipMatch?.[0] ?? "",
    country: /philippines/i.test(text) ? "Philippines" : "",
    position: roleLine ?? "",
    contract: contractLine ?? "",
    expectedSalary: salaryMatch?.[1] ?? "",
    offeredSalary: salaryMatch?.[1] ?? "",
    expectedRate: rate,
    offeredRate: rate
  };
}

function fieldLabel(field: FieldName) {
  const labels: Record<FieldName, string> = {
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    contactNumber: "Contact Number",
    email: "Email Address",
    address: "Address",
    city: "City",
    region: "Region",
    zipCode: "Zip Code",
    country: "Country",
    iMessage: "iMessage",
    position: "Position",
    contract: "Contract",
    expectedSalary: "Expected Salary",
    offeredSalary: "Offered Salary",
    expectedRate: "Expected Rate",
    offeredRate: "Offered Rate"
  };
  return labels[field];
}

function toInitialForm(initialCandidate?: CandidateRecord | null): CandidateForm {
  if (!initialCandidate) {
    return baseInitialForm;
  }

  const { firstName, middleName, lastName } = splitName(initialCandidate.name);
  const salary = parseSalary(initialCandidate.expectedSalary);

  return {
    ...baseInitialForm,
    firstName,
    middleName,
    lastName,
    position: initialCandidate.role,
    expectedSalary: salary.amount,
    offeredSalary: salary.amount,
    expectedRate: salary.rate,
    offeredRate: salary.rate
  };
}

function SalaryField({
  label,
  value,
  error,
  onChange
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label className="text-sm font-medium leading-5 text-[#070a13]">{label}</label>
      <div
        className={`flex items-center rounded-lg border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${
          error ? "border-[#f1080c]" : "border-[#d0d5dd]"
        }`}
      >
        <div className="flex flex-1 items-center gap-2 px-3.5 py-2.5 text-base text-[#667085]">
          <span>$</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-[#667085] outline-none"
            inputMode="decimal"
          />
        </div>
        <div className="flex items-center gap-1 px-3.5 py-2.5 text-base text-[#101828]">
          <span>USD</span>
          <ChevronDownIcon className="h-4 w-4 text-[#64748b]" />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-[#f1080c]">{error}</p>
      ) : (
        <p className="text-xs text-[#667085]">Use gross amount.</p>
      )}
    </div>
  );
}

function RateGroup({
  name,
  value,
  onChange
}: {
  name: string;
  value: RateType;
  onChange: (next: RateType) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {RATE_OPTIONS.map((option) => (
        <label key={`${name}-${option}`} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4 accent-[#1595d4]"
          />
          <span className="text-sm leading-5 text-[#344054]">{option}</span>
        </label>
      ))}
    </div>
  );
}

export function AddCandidateModal({
  open,
  onClose,
  onAddCandidate,
  mode = "add",
  initialCandidate = null
}: AddCandidateModalProps) {
  const [form, setForm] = useState<CandidateForm>(() => toInitialForm(initialCandidate));
  const [errors, setErrors] = useState<ErrorMap>({});
  const [cvFileName, setCvFileName] = useState("");
  const [cvStatus, setCvStatus] = useState("");
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [missingRequiredPrompt, setMissingRequiredPrompt] = useState<FieldName[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toInitialForm(initialCandidate));
    setErrors({});
    setCvFileName("");
    setCvStatus("");
    setIsProcessingCv(false);
    setMissingRequiredPrompt(null);
  }, [open, initialCandidate]);

  const contactDigits = useMemo(() => digitsOnly(form.contactNumber), [form.contactNumber]);

  const setField = <T extends FieldName>(field: T, value: CandidateForm[T]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: ErrorMap = {};
    const missingRequired: FieldName[] = [];

    requiredFields.forEach((field) => {
      if (!String(form[field]).trim()) {
        nextErrors[field] = "This field is required.";
        missingRequired.push(field);
      }
    });

    if (form.email && !isValidEmail(form.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (form.contactNumber && !isValidPhilippinesMobile(form.contactNumber)) {
      nextErrors.contactNumber = "Use a valid PH mobile number (e.g. 9XX XXX XXXX).";
    }

    if (form.zipCode && !/^[A-Za-z0-9\- ]{4,10}$/.test(form.zipCode)) {
      nextErrors.zipCode = "Please enter a valid zip code.";
    }

    if (!parsePositiveAmount(form.expectedSalary)) {
      nextErrors.expectedSalary = "Enter an amount greater than 0.";
    }

    if (!parsePositiveAmount(form.offeredSalary)) {
      nextErrors.offeredSalary = "Enter an amount greater than 0.";
    }

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, missingRequired };
  };

  const toPayload = (source: CandidateForm, allowDraftFallback = false): NewCandidateInput => {
    const resolved = { ...source };
    if (allowDraftFallback) {
      if (!resolved.firstName.trim()) resolved.firstName = "TBD";
      if (!resolved.lastName.trim()) resolved.lastName = "Candidate";
      if (!resolved.contactNumber.trim()) resolved.contactNumber = "900 000 0000";
      if (!resolved.email.trim()) resolved.email = `candidate+${Date.now()}@placeholder.local`;
      if (!resolved.address.trim()) resolved.address = "TBD Address";
      if (!resolved.city.trim()) resolved.city = "Cebu";
      if (!resolved.region.trim()) resolved.region = "Cebu";
      if (!resolved.zipCode.trim()) resolved.zipCode = "6000";
      if (!resolved.country.trim()) resolved.country = "Philippines";
      if (!resolved.position.trim()) resolved.position = "TBD Role";
      if (!resolved.contract.trim()) resolved.contract = "TBD";
      if (!parsePositiveAmount(resolved.expectedSalary)) resolved.expectedSalary = "1,000.00";
      if (!parsePositiveAmount(resolved.offeredSalary)) resolved.offeredSalary = "1,000.00";
    }

    const rateLabel = resolved.expectedRate === "Hourly" ? "Hour" : resolved.expectedRate === "Daily" ? "Day" : "Month";
    const fullName = [resolved.firstName, resolved.middleName, resolved.lastName].filter(Boolean).join(" ").trim();
    const expectedAmount = parsePositiveAmount(resolved.expectedSalary) ?? 1000;
    const offeredAmount = parsePositiveAmount(resolved.offeredSalary) ?? expectedAmount;

    return {
      name: sanitizeText(fullName, 100),
      role: sanitizeText(resolved.position, 100),
      expectedSalary: `$${resolved.expectedSalary} / ${rateLabel}`,
      available: initialCandidate?.available ?? "Yes",
      technologies: initialCandidate?.technologies ?? "List of technologies",
      status: initialCandidate?.status ?? "Pending",
      profile: initialCandidate?.profile,
      contact: {
        phoneCountryCode: "+63",
        phoneNumber: digitsOnly(resolved.contactNumber),
        email: resolved.email.trim(),
        iMessage: resolved.iMessage.trim() || undefined
      },
      location: {
        address: sanitizeText(resolved.address, 200),
        city: sanitizeText(resolved.city, 120),
        region: sanitizeText(resolved.region, 120),
        zipCode: sanitizeText(resolved.zipCode, 20),
        country: sanitizeText(resolved.country, 80)
      },
      compensation: {
        expectedAmount,
        expectedRate: resolved.expectedRate,
        offeredAmount,
        offeredRate: resolved.offeredRate,
        currency: "USD"
      },
      employment: {
        contract: sanitizeText(resolved.contract, 80),
        availability: initialCandidate?.available ?? "Yes"
      }
    };
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validate();
    if (!result.valid) {
      setMissingRequiredPrompt(result.missingRequired);
      return;
    }
    onAddCandidate?.(toPayload(form, false));
    onClose();
  };

  const onCvUpload = async (file: File) => {
    setIsProcessingCv(true);
    setCvStatus("");
    setCvFileName(file.name);
    try {
      const content = await file.text();
      const extracted = extractCvDataFromText(content);
      const populatedFields = Object.entries(extracted).filter(([key, value]) => {
        if (key === "extractedName") return false;
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
      }).length;
      if (populatedFields === 0) {
        setCvStatus("Could not extract enough details from this file. Fill fields manually or use a text-based CV.");
        return;
      }
      setForm((previous) => autoFillMissingWithExtracted(previous, extracted));
      setCvStatus(`CV parsed. Auto-filled ${populatedFields} field${populatedFields > 1 ? "s" : ""}. Please review before saving.`);
      setErrors({});
    } catch {
      setCvStatus("Unable to read CV file. Please try another file.");
    } finally {
      setIsProcessingCv(false);
    }
  };

  const createDraftFromIncomplete = () => {
    onAddCandidate?.(toPayload(form, true));
    setMissingRequiredPrompt(null);
      onClose();
  };

  return (
    <>
      <ModalShell
        open={open}
        title={mode === "edit" ? "Edit Candidate" : "Add New Candidate"}
        onClose={onClose}
        maxWidthClassName="max-w-[600px]"
        bodyClassName="max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "add" ? (
            <div className="rounded-md border border-[#dbe3ea] bg-[#f8fbfd] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Upload Candidate CV</p>
                  <p className="text-xs text-[#667085]">Auto-fill available fields from uploaded CV text.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-[#1595d4] px-3 py-1.5 text-sm font-medium text-[#1595d4] hover:bg-[#e8f4fb]">
                  {isProcessingCv ? "Processing..." : "Upload CV"}
                  <input
                    type="file"
                    accept=".txt,.md,.rtf,.doc,.docx,.pdf"
                    className="hidden"
                    disabled={isProcessingCv}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onCvUpload(file);
                        event.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
              {cvFileName ? <p className="mt-2 text-xs text-[#344054]">File: {cvFileName}</p> : null}
              {cvStatus ? <p className="mt-1 text-xs text-[#667085]">{cvStatus}</p> : null}
            </div>
          ) : null}
        <div className="flex flex-col gap-4 pb-4">
          <div className="grid grid-cols-3 gap-4">
            <FormInputField label="First Name" value={form.firstName} error={errors.firstName} onChange={(value) => setField("firstName", value)} />
            <FormInputField label="Middle Name" value={form.middleName} onChange={(value) => setField("middleName", value)} />
            <FormInputField label="Last Name" value={form.lastName} error={errors.lastName} onChange={(value) => setField("lastName", value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex w-full flex-col gap-1">
              <label className="text-sm font-medium leading-5 text-[#070a13]">Contact Number</label>
              <div className={`flex overflow-hidden rounded border ${errors.contactNumber ? "border-[#f1080c]" : "border-[#d1d1d1]"}`}>
                <span className="flex items-center border-r border-[#d1d1d1] bg-[#f8fafc] px-3 text-sm text-[#5b5b5b]">+63</span>
                <input
                  value={form.contactNumber}
                  onChange={(event) => setField("contactNumber", formatPhilippinesNumber(digitsOnly(event.target.value)))}
                  placeholder="9XX XXX XXXX"
                  className="w-full px-3 py-2 text-base text-[#242424] outline-none placeholder:text-[#797979]"
                  inputMode="numeric"
                />
              </div>
              {errors.contactNumber ? (
                <p className="text-xs text-[#f1080c]">{errors.contactNumber}</p>
              ) : (
                <p className="text-xs text-[#667085]">Format: +63 {formatPhilippinesNumber(contactDigits || "9")}</p>
              )}
            </div>

            <FormInputField
              label="Email Address"
              value={form.email}
              error={errors.email}
              type="email"
              onChange={(value) => setField("email", value)}
            />
          </div>

          <FormInputField label="Address" value={form.address} error={errors.address} onChange={(value) => setField("address", value)} />

          <div className="grid grid-cols-2 gap-4">
            <FormInputField label="City" value={form.city} error={errors.city} onChange={(value) => setField("city", value)} />
            <FormInputField label="Region" value={form.region} error={errors.region} onChange={(value) => setField("region", value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInputField label="Zip Code" value={form.zipCode} error={errors.zipCode} onChange={(value) => setField("zipCode", value)} />
            <FormInputField label="Country" value={form.country} error={errors.country} onChange={(value) => setField("country", value)} />
          </div>

          <FormInputField label="iMessage" optional value={form.iMessage} onChange={(value) => setField("iMessage", value)} />

          <div className="grid grid-cols-2 gap-4">
            <FormInputField label="Position" value={form.position} error={errors.position} onChange={(value) => setField("position", value)} />
            <FormInputField label="Contract" value={form.contract} error={errors.contract} onChange={(value) => setField("contract", value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SalaryField
                label="Expected Salary"
                value={form.expectedSalary}
                error={errors.expectedSalary}
                onChange={(value) => setField("expectedSalary", value)}
              />
              <RateGroup
                name="expected-rate"
                value={form.expectedRate}
                onChange={(option) => setField("expectedRate", option)}
              />
            </div>

            <div>
              <SalaryField
                label="Offered Salary"
                value={form.offeredSalary}
                error={errors.offeredSalary}
                onChange={(value) => setField("offeredSalary", value)}
              />
              <RateGroup
                name="offered-rate"
                value={form.offeredRate}
                onChange={(option) => setField("offeredRate", option)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="h-9 w-full" type="submit">
            {mode === "edit" ? "Save Changes" : "Add Candidate"}
          </Button>
        </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(missingRequiredPrompt)}
        title="Missing Required Information"
        onClose={() => setMissingRequiredPrompt(null)}
        maxWidthClassName="max-w-[520px]"
        showHeaderDivider={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475467]">
            Some required fields are still missing. Please confirm what you want to do next.
          </p>
          {missingRequiredPrompt && missingRequiredPrompt.length > 0 ? (
            <div className="rounded-md border border-[#eaecf0] bg-[#f8fafc] px-3 py-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.02em] text-[#667085]">Missing fields</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-[#344054]">
                {missingRequiredPrompt.map((field) => (
                  <li key={field}>{fieldLabel(field)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="h-9 flex-1" onClick={() => setMissingRequiredPrompt(null)}>
              Continue Editing
            </Button>
            <Button variant="primary" className="h-9 flex-1" onClick={createDraftFromIncomplete}>
              Create Draft Candidate
            </Button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
