/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export class Text {
    constructor(value, sourceSpan) {
        this.value = value;
        this.sourceSpan = sourceSpan;
    }
    visit(visitor) { return visitor.visitText(this); }
}
export class BoundText {
    constructor(value, sourceSpan) {
        this.value = value;
        this.sourceSpan = sourceSpan;
    }
    visit(visitor) { return visitor.visitBoundText(this); }
}
export class TextAttribute {
    constructor(name, value, sourceSpan, valueSpan) {
        this.name = name;
        this.value = value;
        this.sourceSpan = sourceSpan;
        this.valueSpan = valueSpan;
    }
    visit(visitor) { return visitor.visitTextAttribute(this); }
}
export class BoundAttribute {
    constructor(name, type, securityContext, value, unit, sourceSpan) {
        this.name = name;
        this.type = type;
        this.securityContext = securityContext;
        this.value = value;
        this.unit = unit;
        this.sourceSpan = sourceSpan;
    }
    static fromBoundElementProperty(prop) {
        return new BoundAttribute(prop.name, prop.type, prop.securityContext, prop.value, prop.unit, prop.sourceSpan);
    }
    visit(visitor) { return visitor.visitBoundAttribute(this); }
}
export class BoundEvent {
    constructor(name, handler, target, phase, sourceSpan) {
        this.name = name;
        this.handler = handler;
        this.target = target;
        this.phase = phase;
        this.sourceSpan = sourceSpan;
    }
    static fromParsedEvent(event) {
        const target = event.type === 0 /* Regular */ ? event.targetOrPhase : null;
        const phase = event.type === 1 /* Animation */ ? event.targetOrPhase : null;
        return new BoundEvent(event.name, event.handler, target, phase, event.sourceSpan);
    }
    visit(visitor) { return visitor.visitBoundEvent(this); }
}
export class Element {
    constructor(name, attributes, inputs, outputs, children, references, sourceSpan, startSourceSpan, endSourceSpan) {
        this.name = name;
        this.attributes = attributes;
        this.inputs = inputs;
        this.outputs = outputs;
        this.children = children;
        this.references = references;
        this.sourceSpan = sourceSpan;
        this.startSourceSpan = startSourceSpan;
        this.endSourceSpan = endSourceSpan;
    }
    visit(visitor) { return visitor.visitElement(this); }
}
export class Template {
    constructor(attributes, inputs, outputs, children, references, variables, sourceSpan, startSourceSpan, endSourceSpan) {
        this.attributes = attributes;
        this.inputs = inputs;
        this.outputs = outputs;
        this.children = children;
        this.references = references;
        this.variables = variables;
        this.sourceSpan = sourceSpan;
        this.startSourceSpan = startSourceSpan;
        this.endSourceSpan = endSourceSpan;
    }
    visit(visitor) { return visitor.visitTemplate(this); }
}
export class Content {
    constructor(selectorIndex, attributes, sourceSpan) {
        this.selectorIndex = selectorIndex;
        this.attributes = attributes;
        this.sourceSpan = sourceSpan;
    }
    visit(visitor) { return visitor.visitContent(this); }
}
export class Variable {
    constructor(name, value, sourceSpan) {
        this.name = name;
        this.value = value;
        this.sourceSpan = sourceSpan;
    }
    visit(visitor) { return visitor.visitVariable(this); }
}
export class Reference {
    constructor(name, value, sourceSpan) {
        this.name = name;
        this.value = value;
        this.sourceSpan = sourceSpan;
    }
    visit(visitor) { return visitor.visitReference(this); }
}
export class NullVisitor {
    visitElement(element) { }
    visitTemplate(template) { }
    visitContent(content) { }
    visitVariable(variable) { }
    visitReference(reference) { }
    visitTextAttribute(attribute) { }
    visitBoundAttribute(attribute) { }
    visitBoundEvent(attribute) { }
    visitText(text) { }
    visitBoundText(text) { }
}
export class RecursiveVisitor {
    visitElement(element) {
        visitAll(this, element.attributes);
        visitAll(this, element.children);
        visitAll(this, element.references);
    }
    visitTemplate(template) {
        visitAll(this, template.attributes);
        visitAll(this, template.children);
        visitAll(this, template.references);
        visitAll(this, template.variables);
    }
    visitContent(content) { }
    visitVariable(variable) { }
    visitReference(reference) { }
    visitTextAttribute(attribute) { }
    visitBoundAttribute(attribute) { }
    visitBoundEvent(attribute) { }
    visitText(text) { }
    visitBoundText(text) { }
}
export class TransformVisitor {
    visitElement(element) {
        const newAttributes = transformAll(this, element.attributes);
        const newInputs = transformAll(this, element.inputs);
        const newOutputs = transformAll(this, element.outputs);
        const newChildren = transformAll(this, element.children);
        const newReferences = transformAll(this, element.references);
        if (newAttributes != element.attributes || newInputs != element.inputs ||
            newOutputs != element.outputs || newChildren != element.children ||
            newReferences != element.references) {
            return new Element(element.name, newAttributes, newInputs, newOutputs, newChildren, newReferences, element.sourceSpan, element.startSourceSpan, element.endSourceSpan);
        }
        return element;
    }
    visitTemplate(template) {
        const newAttributes = transformAll(this, template.attributes);
        const newInputs = transformAll(this, template.inputs);
        const newOutputs = transformAll(this, template.outputs);
        const newChildren = transformAll(this, template.children);
        const newReferences = transformAll(this, template.references);
        const newVariables = transformAll(this, template.variables);
        if (newAttributes != template.attributes || newInputs != template.inputs ||
            newChildren != template.children || newVariables != template.variables ||
            newReferences != template.references) {
            return new Template(newAttributes, newInputs, newOutputs, newChildren, newReferences, newVariables, template.sourceSpan, template.startSourceSpan, template.endSourceSpan);
        }
        return template;
    }
    visitContent(content) { return content; }
    visitVariable(variable) { return variable; }
    visitReference(reference) { return reference; }
    visitTextAttribute(attribute) { return attribute; }
    visitBoundAttribute(attribute) { return attribute; }
    visitBoundEvent(attribute) { return attribute; }
    visitText(text) { return text; }
    visitBoundText(text) { return text; }
}
export function visitAll(visitor, nodes) {
    const result = [];
    if (visitor.visit) {
        for (const node of nodes) {
            const newNode = visitor.visit(node) || node.visit(visitor);
        }
    }
    else {
        for (const node of nodes) {
            const newNode = node.visit(visitor);
            if (newNode) {
                result.push(newNode);
            }
        }
    }
    return result;
}
export function transformAll(visitor, nodes) {
    const result = [];
    let changed = false;
    for (const node of nodes) {
        const newNode = node.visit(visitor);
        if (newNode) {
            result.push(newNode);
        }
        changed = changed || newNode != node;
    }
    return changed ? result : nodes;
}
//# sourceMappingURL=r3_ast.js.map