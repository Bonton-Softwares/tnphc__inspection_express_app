/**
 * Safe PDFKit text wrapper.
 *
 * Only modifies text() calls that specify a width but no height.
 * This prevents PDFKit from creating unwanted extra pages while
 * leaving normal paragraph/table rendering untouched.
 */

export function disableAutoPagination(doc: any): void {
  const originalText = doc.text.bind(doc);

  doc.text = function (text: string, ...args: any[]) {
    let x: any;
    let y: any;
    let options: any = {};

    if (args.length === 1 && typeof args[0] === "object") {
      options = args[0] ?? {};
    } else if (args.length >= 3) {
      x = args[0];
      y = args[1];
      options = args[2] ?? {};
    }

    if (options.allowWrap) {
      delete options.allowWrap;

      return x === undefined
        ? originalText(text, options)
        : originalText(text, x, y, options);
    }

    const safeOptions = { ...options };

    // Only patch width-based text
    if (safeOptions.width && safeOptions.height === undefined) {
      safeOptions.height = (doc.currentLineHeight?.() ?? 14);
      safeOptions.lineBreak = false;
    }

    return x === undefined
      ? originalText(text, safeOptions)
      : originalText(text, x, y, safeOptions);
  };
}

/**
 * No-op.
 * Never manipulate PDFKit internals.
 */
export function trimTrailingBlankPages(_: any): void {}