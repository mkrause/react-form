
# React form library

Basic React form library. Features a fully consumer controlled form state.


## Usage

```js
import * as ReactForm from '@mkrause/react-form';

const MyForm = () => {
  const [formBuffer, setFormBuffer] = React.useState({ name: '', email: '' });
  
  const validate = React.useCallback(({ name, email }) => {
    const errors = {};
    
    if (name.trim() === '') { errors.name = 'Required'; }
    if (email.trim() === '') { errors.email = 'Required'; }
    else if (!email.includes('@')) { errors.email = 'Invalid email'; }
    
    return errors;
  }, []);
  
  const handleSubmit = React.useCallback(() => {
    // Handle form submit
  }, []);
  
  return (
    <ReactForm.Provider
      buffer={formBuffer}
      onUpdate={setFormBuffer}
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ errors, submit }) =>
        <form onSubmit={submit}>
          <ReactForm.Field
            accessor="name"
          />
          <ReactForm.Field
            accessor="email"
          />
          
          <button type="submit">Submit</button>
        </form>
      }
    </ReactForm.Provider>
  );
};
```
