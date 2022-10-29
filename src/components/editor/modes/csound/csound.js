/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    LRLanguage,
    LanguageSupport,
    foldNodeProp,
    foldInside,
    indentUnit,
    indentNodeProp,
    syntaxTree,
    syntaxTreeAvailable
} from "@codemirror/language";
import { completeFromList } from "@codemirror/autocomplete";
import { Tag, styleTags, tags as t } from "@lezer/highlight";
import { Decoration, ViewPlugin } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { debounce } from "throttle-debounce";
import { parser } from "./syntax.grammar";

window.editorCursorState = {};

const storeCursor = debounce(100, (callback) => {
    if (typeof callback === "function") {
        callback();
    }
});

export const opcodeTag = Tag.define();
export const xmlTag = Tag.define();
export const bracketTag = Tag.define();
export const defineOperatorTag = Tag.define();
export const controlFlowTag = Tag.define();
export const ambiguousTag = Tag.define();

const csoundTags = styleTags({
    instr: defineOperatorTag,
    endin: defineOperatorTag,
    opcode: defineOperatorTag,
    endop: defineOperatorTag,
    String: t.string,
    LineComment: t.lineComment,
    BlockComment: t.comment,
    Opcode: opcodeTag,
    init: opcodeTag,
    AmbiguousIdentifier: ambiguousTag,
    XmlCsoundSynthesizerOpen: xmlTag,
    XmlOpen: xmlTag,
    XmlClose: xmlTag,
    ArrayBrackets: bracketTag,
    if: controlFlowTag,
    do: controlFlowTag,
    fi: controlFlowTag,
    while: controlFlowTag,
    ControlFlowDoToken: controlFlowTag,
    ControlFlowGotoToken: controlFlowTag,
    ControlFlowEndToken: controlFlowTag,
    ControlFlowElseIfToken: controlFlowTag,
    ControlFlowElseToken: controlFlowTag,
    "(": bracketTag,
    ")": bracketTag,
    "[": bracketTag,
    "]": bracketTag,
    "{": bracketTag,
    "}": bracketTag
});

const globalConstantDecoration = Decoration.mark({
    attributes: { class: "cm-csound-global-constant" }
});

const opcodeDecoration = Decoration.mark({
    attributes: { class: "cm-csound-opcode" }
});

const aRateVarDecoration = Decoration.mark({
    attributes: { class: "cm-csound-a-rate-var" }
});

const gaRateVarDecoration = Decoration.mark({
    attributes: {
        class: ["cm-csound-a-rate-var", "cm-csound-global-var"].join(" ")
    }
});

const kRateVarDecoration = Decoration.mark({
    attributes: { class: "cm-csound-k-rate-var" }
});

const gkRateVarDecoration = Decoration.mark({
    attributes: {
        class: ["cm-csound-k-rate-var", "cm-csound-global-var"].join(" ")
    }
});

const sRateVarDecoration = Decoration.mark({
    attributes: { class: "cm-csound-s-rate-var" }
});

const gsRateVarDecoration = Decoration.mark({
    attributes: {
        class: ["cm-csound-s-rate-var", "cm-csound-global-var"].join(" ")
    }
});

const fRateVarDecoration = Decoration.mark({
    attributes: { class: "cm-csound-f-rate-var" }
});

const gfRateVarDecoration = Decoration.mark({
    attributes: { class: ["cm-csound-f-rate-var", "cm-csound-global-var"] }
});

const pFieldVarDecoration = Decoration.mark({
    attributes: { class: "cm-csound-p-field-var" }
});

const xmlTagDecoration = Decoration.mark({
    attributes: { class: "cm-csound-xml-tag" }
});

const gotoTokenDecoration = Decoration.mark({
    attributes: { class: "cm-csound-goto-token" }
});

const macroTokenDecoration = Decoration.mark({
    attributes: { class: "cm-csound-macro-token" }
});

function isGlobalConstant(token) {
    return ["sr", "kr", "ksmps", "0dbfs", "nchnls", "nchnls_i"].includes(token);
}

function decorateAmbigiousToken(token, parentToken) {
    if (isGlobalConstant(token)) {
        return globalConstantDecoration;
    } else if (
        parentToken === "CallbackExpression" ||
        (Array.isArray(window.csoundBuiltinOpcodes) &&
            window.csoundBuiltinOpcodes.includes(token.replace(/:.*/, "")))
    ) {
        return opcodeDecoration;
    } else if (["XmlOpen", "XmlClose"].includes(parentToken)) {
        return xmlTagDecoration;
    } else if (/^p\d+$/.test(token)) {
        return pFieldVarDecoration;
    } else if (token.startsWith("a")) {
        return aRateVarDecoration;
    } else if (token.startsWith("k")) {
        return kRateVarDecoration;
    } else if (token.startsWith("S")) {
        return sRateVarDecoration;
    } else if (token.startsWith("ga")) {
        return gaRateVarDecoration;
    } else if (token.startsWith("gk")) {
        return gkRateVarDecoration;
    } else if (token.startsWith("gS")) {
        return gsRateVarDecoration;
    } else if (token.startsWith("f")) {
        return fRateVarDecoration;
    } else if (token.startsWith("gf")) {
        return gfRateVarDecoration;
    } else if (/^\$.+/.test(token)) {
        return macroTokenDecoration;
    }
}

function variableHighlighter(view) {
    const builder = new RangeSetBuilder();
    for (const { from, to } of view.visibleRanges) {
        if (syntaxTreeAvailable(view.state, to)) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (cursor) => {
                    if (cursor.name === "AmbiguousIdentifier") {
                        // console.log(cursor.node);
                        const tokenSlice = view.state.doc.slice(
                            cursor.from,
                            cursor.to
                        );
                        const token = tokenSlice.text[0];

                        const maybeDecoration = decorateAmbigiousToken(
                            token,
                            cursor.node.parent.name
                        );

                        if (maybeDecoration) {
                            builder.add(
                                cursor.from,
                                cursor.to,
                                maybeDecoration
                            );
                        }
                    }
                }
            });
        }
    }
    return builder.finish();
}

const csoundModePlugin = ViewPlugin.fromClass(
    class {
        constructor(view) {
            const documentUidFieldState = view.state.values.find(
                (state) => typeof state === "object" && state.documentUid
            );

            if (
                typeof documentUidFieldState === "object" &&
                documentUidFieldState.documentUid
            ) {
                this.documentUid = documentUidFieldState.documentUid;
            }

            if (!this.initialized) {
                this.decorations = variableHighlighter(view);
                this.initialized = true;
            }
        }

        update(update) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = variableHighlighter(update.view);
            }

            if (!this.scrollPositionInitialized) {
                const view = update.view;

                const documentUid = this.documentUid;

                if (
                    documentUid &&
                    typeof window.editorCursorState[
                        `${documentUid}:scrollTop`
                    ] === "number"
                ) {
                    view.requestMeasure({
                        read() {
                            return {
                                cursor: view.coordsAtPos(
                                    view.state.selection.main.head
                                ),
                                scroller: view.scrollDOM.getBoundingClientRect()
                            };
                        },
                        write() {
                            view.scrollDOM.scrollTop =
                                window.editorCursorState[
                                    `${documentUid}:scrollTop`
                                ];
                        }
                    });

                    if (
                        view.scrollDOM.scrollTop ===
                        window.editorCursorState[`${documentUid}:scrollTop`]
                    ) {
                        this.scrollPositionInitialized = true;
                    }
                } else {
                    this.scrollPositionInitialized = true;
                }
            }
        }
    },
    {
        decorations: (v) => v.decorations,
        eventHandlers: {
            scroll: function (_, view) {
                const documentUid = this.documentUid;
                if (documentUid && view.scrollDOM.scrollTop > 0) {
                    storeCursor(() => {
                        window.editorCursorState[`${documentUid}:scrollTop`] =
                            view.scrollDOM.scrollTop;
                    });
                }
            }
        }
    }
);

export const orcLanguage = LRLanguage.define({
    dialect: "csd",
    parser: parser.configure({
        props: [
            csoundTags,
            indentNodeProp.add({
                InstrumentDeclaration: (context) =>
                    context.column(context.node.from) + context.unit,
                UdoDeclaration: (context) =>
                    context.column(context.node.from) + context.unit,
                ControlFlowStatement: (context) =>
                    context.column(context.node.from) + context.unit
            }),
            foldNodeProp.add({
                InstrumentDeclaration: foldInside,
                UdoDeclaration: foldInside
            })
        ]
        //strict: true
    }),
    languageData: {
        closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
        commentTokens: { line: "//", block: { open: "/*", close: "*/" } }
    }
});

export const csdLanguage = orcLanguage.configure({ dialect: "csd" });

export function csoundMode() {
    const completionList = csdLanguage.data.of({
        autocomplete: completeFromList(
            (window.csoundSynopsis || [])
                .filter(
                    ({ opname }) =>
                        !["0dbfs", "sr", "kr", "ksmps", "nchnls"].includes(
                            opname
                        )
                )
                .map(({ opname, short_desc, type }) => ({
                    label: opname,
                    type: type === "opcode" ? "keyword" : "function",
                    detail: short_desc
                }))
        )
    });
    return new LanguageSupport(csdLanguage, [
        completionList,
        csoundModePlugin,
        indentUnit.of("  ")
    ]);
}
