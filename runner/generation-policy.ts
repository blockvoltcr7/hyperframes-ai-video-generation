import policy from "./generation-policy.json";

export const ALLOWED_TEMPLATES = new Set(policy.templates);
export const ALLOWED_WORKFLOWS = new Set(policy.workflows);
export const ALLOWED_IMAGE_MODES = new Set(policy.imageModes);

export const DEFAULT_WORKFLOW = policy.defaults.workflow;
export const DEFAULT_TEMPLATE = policy.defaults.template;
export const DEFAULT_IMAGES = policy.defaults.images;

export const GENERATION_POLICY = policy;
