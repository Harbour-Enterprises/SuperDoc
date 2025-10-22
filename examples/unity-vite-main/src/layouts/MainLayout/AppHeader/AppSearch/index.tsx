import { Combobox, ComboboxItem } from '@abbvie-unity/react';
import { matchSorter } from 'match-sorter';
import { startTransition, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppRoutes } from 'routes/routes';

const pages = [
  { title: 'Page 1', to: AppRoutes.HOME },
  { title: 'Page 2', to: AppRoutes.PAGE2 },
];

const AppSearch = () => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const matches = useMemo(() => {
    return matchSorter(pages, searchValue, {
      keys: ['title'],
      baseSort: (a, b) => (a.index < b.index ? -1 : 1),
    });
  }, [searchValue]);

  return (
    <>
      <Combobox
        placeholder="Search"
        autoSelect
        popoverProps={{
          unmountOnHide: true,
          // Use `finalFocus` to set focus to an element on the page being navigated to. This will help accessibility.
          // finalFocus: someElementRefOnLandingPage
        }}
        providerProps={{
          open,
          setOpen,
          setValue: (value) => startTransition(() => setSearchValue(value)),
          resetValueOnHide: true,
        }}
      >
        {matches.map((page) => (
          <ComboboxItem
            focusOnHover
            hideOnClick
            render={<Link to={page.to} />}
            key={page.title}
          >
            {page.title}
          </ComboboxItem>
        ))}
      </Combobox>
    </>
  );
};

export default AppSearch;
