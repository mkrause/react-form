
import $msg from 'message-tag';

import * as React from 'react';


export const Context = React.createContext();

const hasAccessor = (accessor, buffer) => {
  if (typeof accessor === 'function') {
    throw new TypeError('TODO');
  } else if (typeof accessor === 'string') {
    return accessor.split('.')
      .reduce(
        (buffer, key) => {
          if (typeof buffer !== 'object' || buffer === null) {
            return false;
          } else if (!Object.prototype.hasOwnProperty.call(buffer, key)) {
            return false;
          } else {
            return true;
          }
        },
        buffer
      );
  } else {
    throw new TypeError($msg`Unknown accessor type ${accessor}`);
  }
};

const selectWithAccessor = (accessor, buffer) => {
  if (typeof accessor === 'function') {
    return accessor(buffer);
  } else if (typeof accessor === 'string') {
    return accessor.split('.')
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

const updateWithAccessor = (accessor, buffer, value) => {
  if (typeof accessor === 'function') {
    throw new TypeError('TODO'); // Idea: use { has, get, set } object instead?
  } else if (typeof accessor === 'string') {
    const [key, ...path] = accessor.split('.');
    
    if (typeof buffer !== 'object' || buffer === null) {
      throw new TypeError($msg`Cannot access ${key} on non-object ${buffer}`);
    } else if (!Object.prototype.hasOwnProperty.call(buffer, key)) {
      throw new TypeError($msg`Missing key ${key} on object ${buffer}`);
    }
    
    if (path.length === 0) {
      return { ...buffer, [key]: value };
    } else {
      return updateWithAccessor(path, buffer[key], value);
    }
  } else {
    throw new TypeError($msg`Unknown accessor type ${accessor}`);
  }
};

const setWithAccessor = (accessor, buffer, value) => {
  if (typeof accessor === 'function') {
    throw new TypeError('TODO'); // Idea: use { get, set } object instead?
  } else if (typeof accessor === 'string') {
    const [key, ...path] = accessor.split('.');
    
    let bufferAsObject = buffer;
    
    if (typeof buffer !== 'object' || buffer === null) {
      throw new TypeError($msg`Cannot access ${key} on non-object ${buffer}`);
    } else if (!Object.prototype.hasOwnProperty.call(buffer, key)) {
      bufferAsObject = { ...buffer, [key]: {} };
    }
    
    if (path.length === 0) {
      const updatedValue = typeof value === 'function'
        ? value(bufferAsObject[key])
        : value;
      return { ...bufferAsObject, [key]: updatedValue };
    } else {
      return updateWithAccessor(path, bufferAsObject[key], value);
    }
  } else {
    throw new TypeError($msg`Unknown accessor type ${accessor}`);
  }
};

export const Field = ({ children, component: FieldComponent = 'input', accessor, ...props } = {}) =>
  <Context.Consumer>
    {({ buffer, updateBuffer, updateMeta }) => {
      const value = selectWithAccessor(accessor, buffer);
      
      const fieldProps = {
        onChange: evt => { updateBuffer(accessor, evt.target.value); },
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
          ? children(fieldProps, actions)
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
    {({ errors, meta }) => {
      if (!hasAccessor(accessor, meta) || !selectWithAccessor(accessor, meta).touched) {
        return null;
      }
      
      try {
        const error = selectWithAccessor(accessor, errors);
        
        if (typeof children !== 'undefined') {
          return typeof children === 'function'
            ? children(error)
            : children;
        } else {
          return <ErrorComponent {...props}>{error}</ErrorComponent>;
        }
      } catch (e) {
        // No error, so ignore
        return null;
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
    
    this.setState({ errors: this.props.validate(buffer) });
  };
  
  componentDidMount() {
    this.validate(this.props.buffer);
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
      
      errors: this.state.errors,
      // updateError: (accessor, error) => {
      //   this.setState({ errors: updateWithAccessor(accessor, this.state.errors, error) });
      // },
      
      meta: this.state.meta,
      // updateMeta: (accessor, fieldMeta) => {
      //   this.setState({ meta: setWithAccessor(accessor, this.state.meta, fieldMeta) });
      // },
      
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
