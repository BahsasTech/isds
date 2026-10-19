<?php
/**
 * LSDS API - minimal regex router.
 *
 * Patterns use "{name}" placeholders, e.g. "/applications/{id}/decision".
 * A matched route invokes its handler with the Request and an associative
 * array of captured parameters.
 */

declare(strict_types=1);

namespace Lsds;

final class Router
{
    /** @var array<int,array{method:string,regex:string,params:string[],handler:callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function add(string $method, string $pattern, callable $handler): void
    {
        $params  = [];
        $regex   = preg_replace_callback('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $pattern);

        $regex = '#^' . $regex . '$#';

        $this->routes[] = [
            'method'  => strtoupper($method),
            'regex'   => $regex,
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): void
    {
        $pathMatched = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $request->path, $matches)) {
                continue;
            }
            $pathMatched = true;

            if ($route['method'] !== $request->method) {
                continue;
            }

            array_shift($matches); // drop the full match
            $params = [];
            foreach ($route['params'] as $i => $name) {
                $params[$name] = $matches[$i] ?? null;
            }

            $request->setParams($params);
            ($route['handler'])($request, $params);
            return;
        }

        if ($pathMatched) {
            throw new ApiException('Method not allowed.', 405);
        }

        throw ApiException::notFound('Endpoint not found: ' . $request->path);
    }
}
