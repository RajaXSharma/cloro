/**
 * The download filename for a project export: the project name lowercased, with
 * every run of non-alphanumerics collapsed to `-` ("Cloro Demo 2!" → `cloro-demo-2.zip`).
 * The backend sends it in `Content-Disposition` and the web client uses it for the
 * blob download, so both name the file from one rule.
 *
 * ponytail: ASCII only, so a project named entirely in another script falls back to
 * `project.zip`. Keeps `Content-Disposition` quoting trivial; add RFC 5987
 * (`filename*=UTF-8''…`) if non-Latin project names start mattering.
 */
export function zipFilename(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `${slug || "project"}.zip`;
}
