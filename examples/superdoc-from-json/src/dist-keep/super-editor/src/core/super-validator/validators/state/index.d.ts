export type StateValidators = {
    /**
     * - Validator for image nodes.
     */
    imageNodeValidator: import("../../types.js").StateValidator;
    /**
     * - Validator for link marks.
     */
    linkMarkValidator: import("../../types.js").StateValidator;
};
export namespace StateValidators {
    export { createImageNodeValidator as imageNodeValidator };
    export { createLinkMarkValidator as linkMarkValidator };
}
import { createImageNodeValidator } from './nodes/image/image-validator.js';
import { createLinkMarkValidator } from './nodes/link/link-validator.js';
