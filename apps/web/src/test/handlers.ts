import type { ApiErrorBody, CategoryPage, EnquiryCreated } from '@catalogue/contracts';
import { http, HttpResponse } from 'msw';
import { CATEGORIES, FEATURED, PRODUCTS } from './fixtures';

/** Request bodies the fake API received on POST /enquiries, so tests can assert what was sent. */
export const receivedEnquiries: unknown[] = [];

const api = (path: string) => `*/api/v1${path}`;

export const errorBody = (code: ApiErrorBody['error']['code'], message: string): ApiErrorBody => ({
  error: { code, message },
});

/** A small fake of the catalogue API: just enough behaviour for the UI tests. */
export const handlers = [
  http.get(api('/catalog/featured'), () => HttpResponse.json(FEATURED)),

  http.get(api('/categories'), () => HttpResponse.json(CATEGORIES)),

  http.get(api('/categories/:slug'), ({ params }) => {
    const category = CATEGORIES.find((c) => c.slug === params.slug);
    if (!category) return HttpResponse.json(errorBody('NOT_FOUND', 'Category not found'), { status: 404 });

    const inCategory = PRODUCTS.filter((p) => p.category.slug === category.slug);
    const page: CategoryPage = { category, topRated: inCategory.slice(0, 2), others: inCategory.slice(2) };
    return HttpResponse.json(page);
  }),

  http.get(api('/products'), ({ request }) => {
    const term = new URL(request.url).searchParams.get('search')?.trim().toLowerCase() ?? '';
    if (!term) {
      return HttpResponse.json(errorBody('VALIDATION_ERROR', 'Enter a search term'), { status: 400 });
    }
    return HttpResponse.json(
      PRODUCTS.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(term)),
    );
  }),

  http.post(api('/enquiries'), async ({ request }) => {
    receivedEnquiries.push(await request.json());
    const created: EnquiryCreated = { id: 'enq-123', status: 'received' };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(api('/products/:id'), ({ params }) => {
    const found = PRODUCTS.find((p) => p.id === params.id);
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json(errorBody('NOT_FOUND', 'Product not found'), { status: 404 });
  }),
];
