import { SearchOutlined } from '@ant-design/icons';
import { SEARCH_TERM_MAX_LENGTH } from '@catalogue/contracts';
import { Button, Input, Space } from 'antd';
import { type FormEvent, useState } from 'react';

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  onSearch: (term: string) => void;
}

/** Search runs when the Search button is clicked (or Enter is pressed), not while typing. */
export function SearchBar({ initialValue = '', placeholder = 'Search products', onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const term = value.trim();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (term) onSearch(term);
  };

  return (
    <form role="search" onSubmit={handleSubmit}>
      <Space.Compact block>
        <Input
          type="search"
          aria-label="Search products"
          placeholder={placeholder}
          value={value}
          maxLength={SEARCH_TERM_MAX_LENGTH}
          prefix={<SearchOutlined aria-hidden />}
          allowClear
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="primary" htmlType="submit" disabled={!term}>
          Search
        </Button>
      </Space.Compact>
    </form>
  );
}
