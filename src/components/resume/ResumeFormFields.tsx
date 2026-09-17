import {
  RESUME_FIELDS,
  ResumeFields,
} from "../../type/resume";


interface ResumeFormFieldsProps {
  value: ResumeFields;
  onChange: (value: ResumeFields) => void;
}

export default function ResumeFormFields({
  value,
  onChange,
}: ResumeFormFieldsProps) {
  const inputClass =
    "mt-2 w-full rounded-xl border border-border bg-input-background px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {RESUME_FIELDS.map((field) => (
          <label
            key={field.key}
            className={`block text-sm font-semibold ${
              "rows" in field
                ? "border-t border-border pt-5 sm:col-span-2"
                : ""
            }`}
          >
            {field.label}

            {"rows" in field ? (
              <textarea
                rows={field.rows}
                className={`${inputClass} resize-y`}
                placeholder={field.placeholder}
                value={value[field.key] ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [field.key]: event.target.value,
                  })
                }
              />
            ) : (
              <input
                type={
                  field.key === "email"
                    ? "email"
                    : field.key === "phone"
                    ? "tel"
                    : "text"
                }
                className={inputClass}
                placeholder={field.placeholder}
                value={value[field.key] ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [field.key]: event.target.value,
                  })
                }
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

