
import $msg from 'message-tag';

import hoistNonReactStatics from 'hoist-non-react-statics';
import * as React from 'react';


export const Context = React.createContext();

// Check if the given buffer has the given accessor
export const hasAccessor = (accessor, buffer) => {
    if (typeof accessor === 'function') {
        let acc;
        try {
            acc = accessor(buffer);
            return true;
        } catch (e) {
            return false;
        }
    } else if (Array.isArray(accessor)) {
        if (accessor.length === 0) {
            return true;
        }
        const [key, ...accessorRest] = accessor;
        if (typeof buffer !== 'object' || buffer === null) { return false; }
        if (!Object.prototype.hasOwnProperty.call(buffer, key)) { return false; }
        return hasAccessor(accessorRest, buffer[key]);
    } else if (typeof accessor === 'string') {
        return hasAccessor(accessor.split('.'), buffer);
    } else {
        throw new TypeError($msg`Unknown accessor type ${accessor}`);
    }
};

// Select the value at the given accessor
export const selectWithAccessor = (accessor, buffer) => {
    if (typeof accessor === 'function') {
        return accessor(buffer);
    } else if (typeof accessor === 'string') {
        if (accessor === '') {
            return selectWithAccessor([], buffer);
        } else {
            return selectWithAccessor(accessor.split('.'), buffer);
        }
    } else if (Array.isArray(accessor)) {
        return accessor
            .reduce(
                (buffer, key) => {
                    if (typeof buffer !== 'object' || buffer === null) {
                        throw new TypeError($msg`Cannot access ${key} on non-object ${buffer}`);
                    } else if (!Object.prototype.hasOwnProperty.call(buffer, key)) {
                        throw new TypeError($msg`Missing key ${key} on object ${buffer}`);
                    } else {
                        return buffer[key];
                    }
                },
                buffer
            );
    } else {
        throw new TypeError($msg`Unknown accessor type ${accessor}`);
    }
};

// Return an updated version of the given buffer (where the property may not already exist)
export const setWithAccessor = (accessor, buffer, value) => {
    if (typeof accessor === 'function') {
        // Idea: use { has, get, set } object instead?
        throw new TypeError('Cannot update buffer given function accessor');
    } else if (typeof accessor === 'string') {
        if (accessor === '') {
            return setWithAccessor([], buffer, value);
        } else {
            return setWithAccessor(accessor.split('.'), buffer, value);
        }
    } else if (Array.isArray(accessor)) {
        if (accessor.length === 0) {
            return value;
        }
        
        const [key, ...path] = accessor;
        
        const bufferAsObject = typeof buffer === 'object' && buffer !== null
            ? buffer
            : {};
        
        if (path.length === 0) {
            const updatedValue = typeof value === 'function'
                ? value(bufferAsObject[key])
                : value;
            
            if (Array.isArray(bufferAsObject)) {
                const bufferAsArray = [...bufferAsObject]; // Copy so we can mutate
                bufferAsArray.splice(key, 1, updatedValue);
                return bufferAsArray;
            } else {
                return { ...bufferAsObject, [key]: updatedValue };
            }
        } else {
            const prop = Object.prototype.hasOwnProperty.call(bufferAsObject, key)
                ? bufferAsObject[key]
                : {};
            
            if (Array.isArray(bufferAsObject)) {
                const bufferAsArray = [...bufferAsObject]; // Copy so we can mutate
                bufferAsArray.splice(key, 1, setWithAccessor(path, prop, value));
                return bufferAsArray;
            } else {
                return { ...bufferAsObject, [key]: setWithAccessor(path, prop, value) };
            }
        }
    } else {
        throw new TypeError($msg`Unknown accessor type ${accessor}`);
    }
};

// Return an updated version of the given buffer (where the property is assumed to exist)
export const updateWithAccessor = (accessor, buffer, value) => {
    if (typeof accessor === 'function') {
        // Idea: use { has, get, set } object instead?
        throw new TypeError('Cannot update buffer given function accessor');
    } else if (typeof accessor === 'string') {
        if (accessor === '') {
            return updateWithAccessor([], buffer, value);
        } else {
            return updateWithAccessor(accessor.split('.'), buffer, value);
        }
    } else if (Array.isArray(accessor)) {
        if (accessor.length === 0) {
            return typeof value === 'function'
                ? value(buffer)
                : value;
        }
        
        const [key, ...path] = accessor;
        
        if (typeof buffer !== 'object' || buffer === null) {
            throw new TypeError($msg`Cannot access ${key} on non-object ${buffer}`);
        } else if (!Object.prototype.hasOwnProperty.call(buffer, key)) {
            throw new TypeError($msg`Missing key ${key} on object ${buffer}`);
        }
        
        if (path.length === 0) {
            const updatedValue = typeof value === 'function'
                ? value(buffer[key])
                : value;
            
            if (Array.isArray(buffer)) {
                const bufferAsArray = [...buffer]; // Copy so we can mutate
                bufferAsArray.splice(key, 1, updatedValue);
                return bufferAsArray;
            } else {
                return { ...buffer, [key]: updatedValue };
            }
        } else {
            if (Array.isArray(buffer)) {
                const bufferAsArray = [...buffer]; // Copy so we can mutate
                bufferAsArray.splice(key, 1, updateWithAccessor(path, buffer[key], value));
                return bufferAsArray;
            } else {
                return { ...buffer, [key]: updateWithAccessor(path, buffer[key], value) };
            }
        }
    } else {
        throw new TypeError($msg`Unknown accessor type ${accessor}`);
    }
};

export const getError = ({ meta, errors, submitted }, accessor) => {
    const fieldMeta = hasAccessor(accessor, meta)
        ? selectWithAccessor(accessor, meta)
        : { touched: false };
    
    // Only show the error message if the user has interacted with the form/field somehow
    const shouldShowMessage =
        submitted
        || fieldMeta.touched;
    
    if (!shouldShowMessage) {
        return null;
    }
    
    try {
        return selectWithAccessor(accessor, errors);
    } catch (e) {
        // No error
        return null;
    }
};

export const Field = ({ children, component: FieldComponent = 'input', accessor, ...props } = {}) =>
    <Context.Consumer>
        {({ buffer, updateBuffer, meta, updateMeta, errors, submitted }) => {
            const value = selectWithAccessor(accessor, buffer);
            
            const formMeta = {
                submitted,
            };
            
            const fieldMeta = hasAccessor(accessor, meta) ? selectWithAccessor(accessor, meta) : {
                touched: false,
            };
            
            const fieldError = getError({ meta, errors, submitted }, accessor);
            
            const fieldProps = {
                onChange: evt => {
                    let value = evt.target.value;
                    if (evt.target.hasOwnProperty('checked')) {
                        value = evt.target.checked;
                    }
                    
                    updateBuffer(accessor, value);
                },
                onBlur: evt => {
                    if (!hasAccessor(accessor, meta) || !selectWithAccessor(accessor, meta).touched) {
                        const metaUpdated = setWithAccessor(accessor, meta,
                            fieldMeta => ({ ...(fieldMeta || {}), touched: true })
                        );
                        
                        updateMeta(metaUpdated);
                    }
                },
                ...props
            };
            if (typeof value === 'string') {
                fieldProps.value = value;
            } else if (typeof value === 'number') {
                fieldProps.value = String(value);
            } else if (typeof value === 'boolean') {
                fieldProps.checked = value;
            } else {
                throw new TypeError($msg`Unknown value type: ${value}`);
            }
            
            if (typeof children !== 'undefined') {
                const actions = {
                    update: value => { updateBuffer(accessor, value); },
                };
                
                return typeof children === 'function'
                    ? children({ formMeta, fieldProps, fieldMeta, fieldError }, actions)
                    : children;
            }
            
            return (
                <FieldComponent {...fieldProps}/>
            );
        }}
    </Context.Consumer>;

export const Fields = {
    Text: props =>
        <Context.Consumer>
            {({ buffer }) =>
                <input/> // TODO
            }
        </Context.Consumer>,
};

export const ErrorMessage = ({ children, component: ErrorComponent = React.Fragment, accessor, ...props }) =>
    <Context.Consumer>
        {({ meta, errors, submitted }) => {
            const error = getError({ meta, errors, submitted }, accessor);
            
            if (error === null) {
                return null;
            }
            
            if (typeof children !== 'undefined') {
                return typeof children === 'function'
                    ? children(error)
                    : children;
            } else {
                return <ErrorComponent {...props}>{error}</ErrorComponent>;
            }
        }}
    </Context.Consumer>;

export class Provider extends React.PureComponent {
    // props : {
    //   buffer : any,
    //   onUpdate : Function,
    //   validate ?: Function,
    //   onSubmit : Function,
    // };
    
    state = {
        errors: {},
        pristine: true,
        submitted: false,
        meta: {},
    };
    
    validate = buffer => {
        if (!this.props.validate) {
            return;
        }
        
        const errors = this.props.validate(buffer) || {};
        
        this.setState({ errors });
    };
    
    componentDidMount() {
        this.validate(this.props.buffer);
    }
    
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.buffer !== this.props.buffer) {
            this.validate(this.props.buffer);
        }
    }
    
    render() {
        const { buffer } = this.props;
        
        const formProps = {
            buffer,
            updateBuffer: (accessor, value) => {
                const updatedBuffer = updateWithAccessor(accessor, buffer, value);
                
                this.props.onUpdate(updatedBuffer);
                
                if (this.state.pristine) {
                    this.setState({ pristine: false });
                }
                
                if (!hasAccessor(accessor, this.state.meta) || !selectWithAccessor(accessor, this.state.meta).touched) {
                    const meta = setWithAccessor(accessor, this.state.meta,
                        fieldMeta => ({ ...(fieldMeta || {}), touched: true })
                    );
                    
                    this.setState({ meta });
                }
                
                this.validate(updatedBuffer);
            },
            
            pristine: this.state.pristine,
            submitted: this.state.submitted,
            
            errors: this.state.errors,
            // updateError: (accessor, error) => {
            //   this.setState({ errors: updateWithAccessor(accessor, this.state.errors, error) });
            // },
            
            meta: this.state.meta,
            updateMeta: meta => {
              this.setState({ meta });
            },
            
            submit: () => {
                this.setState({
                    pristine: false,
                    submitted: true,
                }, () => {
                    if (Object.keys(this.state.errors).length > 0) {
                        return;
                    }
                    
                    this.props.onSubmit();
                });
            },
        };
        
        return (
            <Context.Provider value={formProps}>
                {typeof this.props.children === 'function'
                    ? this.props.children(formProps)
                    : this.props.children
                }
            </Context.Provider>
        );
    }
}

export const withForm = Component => {
    const WithForm = props =>
        <Context.Consumer>
            {({ buffer, updateBuffer, updateMeta }) =>
                <Component {...props} buffer={buffer} updateBuffer={updateBuffer} updateMeta={updateMeta}/>
            }
        </Context.Consumer>;
    
    hoistNonReactStatics(WithForm, Component);
    
    return WithForm;
};
